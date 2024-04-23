---
title: triton-shared CPU后端分析
date: 2024-04-23 10:13:11 +/-0800
categories: [learning, technology]
tags: [deep learning]     # TAG names should always be lowercase
---

# triton-shared CPU后端编译
triton-shared由triton源码作为子模块编译，大致代码与triton相同。仓库新增了一个CPU后端，挖一下实现流程。  
从`@triton.jit`开始与原生triton一样，一直走到`JitFunction`封装kernel：
```python
# compile the kernel
    src = ASTSource(self, signature, constants, configs[0])
    self.cache[device][key] = compile(
        src,
        target=target,
        options=options.__dict__,
    )
```
src是kernel的ast，进入`triton-shared/triton/python/triton/compiler.py`执行编译，compiler有一套编译流水线：
```python
# run compilation pipeline  and populate metadata
    stages = dict()
    backend.add_stages(stages, options)
    first_stage = list(stages.keys()).index(src.ext)
```
执行该流水线，在`triton-shared/backend/complier.py`内配置流水线步骤：
```python
def add_stages(self, stages, options):
        stages["ttir"] = lambda src, metadata: self.make_ttir(src, metadata, options)
        stages["ttsharedir"] = lambda src, metadata: _optimize_ttsharedir(_ttir_to_ttsharedir(src))
        stages["llir"] = lambda src, metadata: _optimize_llir(_ttsharedir_to_llir(src))
        stages["cpuasm"] = lambda src, metadata: _llir_to_bin(src, metadata)
```
在for循环内执行上述ir迭代流程。写入metadata：
```python
    try:
        module = src.make_ir(options, context)
    except Exception as e:
        filter_traceback(e)
        raise
    for ext, compile_ir in list(stages.items())[first_stage:]:
        next_module = compile_ir(module, metadata)
        ir_filename = f"{src.name}.{ext}"
        metadata_group[ir_filename] = fn_cache_manager.put(next_module, ir_filename)
        if fn_dump_manager is not None:
            fn_dump_manager.put(next_module, ir_filename)
        if (fn_override_manager is not None and fn_override_manager.has_file(ir_filename)):
            print(f"\nOverriding kernel with file {ir_filename}")
            full_name = fn_override_manager.get_file(ir_filename)
            next_module = parse(full_name, ext, context)
        module = next_module
    # write-back metadata
    metadata_group[metadata_filename] = fn_cache_manager.put(json.dumps(metadata, default=vars), metadata_filename,
                                                             binary=False)
    fn_cache_manager.put_group(metadata_filename, metadata_group)
    # return handle to compiled kernel
    return CompiledKernel(src, metadata_group, hash)
```
最终返回一个`CompiledKernel`实例，在对此实例配置kernel的grid语法下会触发以下代码：
```python
def __getitem__(self, grid):
    self._init_handles()

    def runner(*args, stream=None):
        if stream is None:
            device = driver.active.get_current_device()
            stream = driver.active.get_current_stream(device)
        md = self.metadata
        self.run(grid[0], grid[1], grid[2], md.num_warps, md.num_ctas, md.cluster_dims[0], md.cluster_dims[1],
                    md.cluster_dims[2], md.shared, stream, self.function, CompiledKernel.launch_enter_hook,
                    CompiledKernel.launch_exit_hook, md, *args)

    return runner
```
先执行一次`self._init_handles()`，代码如下：
```python
def _init_handles(self):
    if self.module is not None:
        return
    device = driver.active.get_current_device()
    # create launcher
    self.run = driver.active.launcher_cls(self.src, self.metadata)
    # not enough shared memory to run the kernel
    max_shared = driver.active.utils.get_device_properties(device)["max_shared_mem"]
    if self.metadata.shared > max_shared:
        raise OutOfResources(self.metadata.shared, max_shared, "shared memory")
    # TODO: n_regs, n_spills should be metadata generated when calling `ptxas`
    self.module, self.function, self.n_regs, self.n_spills = driver.active.utils.load_binary(
        self.name, self.kernel, self.metadata.shared, device)
```
创建了一个driver的`launcher_cls`加载器，如果是CPU后端的driver加载器则指向了`CPULauncher`：
```python
class CPULauncher(object):

    def __init__(self, src, metadata):
        constants = src.constants if hasattr(src, "constants") else dict()

        kernel_placeholder_name = "KERNEL_NAME_PLACEHOLDER"
        launcher_src = _generate_launcher(constants, src.signature, kernel_placeholder_name)
        # Later KERNEL_NAME_PLACEHOLDER will be used to assign the kernel name
        # in the following launch function.
        self.launch = compile_module(launcher_src, kernel_placeholder_name)

    def __call__(self, *args, **kwargs):
        self.launch(*args, **kwargs)

class CPUDriver(DriverBase):

    def __init__(self):
        super().__init__()
        self.utils = CPUUtils()
        self.launcher_cls = CPULauncher
        self.binary_ext = "cpuasm"
```
其中`_generate_launcher()`生成了一段C代码的主程序，在grid维度下运行kernel代码，并封装成可供python调用的外部C模块：
```c
{% raw %}
...
extern "C" {{
  // Pointer type (=Memref) becomes int64_t + MemRef struct
  // FIXME: understand what this int64_t is used for.
  void {kernel_name}({', '.join(_ty_to_cpp(ty) if ty[0] != "*" else f"int64_t, void*" for i, ty in signature.items() if i not in constants)},
                       int, int, int, int, int, int);
}}

static void _launch(int gridX, int gridY, int gridZ, {arg_decls}) {{
  if (gridX*gridY*gridZ > 0) {{
    // Cast "function" to the real function type.
    for(int x = 0; x < gridX; x++) {{
      for(int y = 0; y < gridY; y++) {{
        for(int z = 0; z < gridZ; z++) {{
          // Use some random type "char" here.
          {' '.join(f'StridedMemRefType<char, 0> ptr_arg{i} = {{static_cast<char *>(arg{i}), static_cast<char *>(arg{i}), 0}};' for i, ty in signature.items() if i not in constants and ty[0] == "*")}
          {kernel_name}({', '.join(f"static_cast<{_ty_to_cpp(ty)}>(arg{i})" if ty[0] != "*" else f"0, &ptr_arg{i}" for i, ty in signature.items() if i not in constants)},
                        gridX, gridY, gridZ, x, y, z);
        }}
      }}
    }}
  }}
}}
...
{% endraw %}
```
`_generate_launcher()`执行完成后，执行`compile_module()`，返回一个`launch()`方法供后续调用：
```python
def compile_module(launcher_src, kernel_placeholder_name):
    # This function was renamed and made public in Python 3.10
    if hasattr(sysconfig, 'get_default_scheme'):
        scheme = sysconfig.get_default_scheme()
    else:
        scheme = sysconfig._get_default_scheme()
    # 'posix_local' is a custom scheme on Debian. However, starting Python 3.10, the default install
    # path changes to include 'local'. This change is required to use triton with system-wide python.
    if scheme == 'posix_local':
        scheme = 'posix_prefix'
    py_include_dir = sysconfig.get_paths(scheme=scheme)["include"]
    cpu_backend_path = Path(__file__).resolve().parent
    include_dir = os.path.join(cpu_backend_path, "include")

    def launch(
        gridX, gridY, gridZ, num_warps, num_ctas, clusterDim0, clusterDim1, clusterDim2,
        shared, stream, cu_function, launch_enter_hook, launch_exit_hook, metadata,
        *args):
        # Unlike CUDA/HIP, we cannot easily pass function pointer across different pybind libraries.
        # Let's compile a kernel every time.
        # The cu_function parameter actually contains our assembly source code.
        # See CPUUtils.load_binary method.
        asm_src = cu_function
        src = launcher_src.replace(kernel_placeholder_name, metadata.name)

        key = hashlib.md5(src.encode("utf-8")).hexdigest()
        cache = get_cache_manager(key)
        name = "__triton_shared_ref_cpu_kernel_launcher"
        filename = f"{name}.so"
        cache_path = cache.get_file(filename)

        if cache_path is None:
          with tempfile.TemporaryDirectory() as tmpdir:
              asm_src_path = os.path.join(tmpdir, "kernel.s")
              launcher_src_path = os.path.join(tmpdir, "main.cxx")
              so_path = os.path.join(tmpdir, "kernel.so")
              Path(asm_src_path).write_bytes(asm_src)
              Path(launcher_src_path).write_text(src)
              # Compile it together.
              subprocess.check_call([
                "g++", launcher_src_path, asm_src_path,
                f"-I{py_include_dir}", f"-I{include_dir}",
                "-shared", "-fPIC", "-o", so_path
              ])

              with open(so_path, "rb") as f:
                cache_path = cache.put(f.read(), filename, binary=True)

        # Load and launch the compiled kernel.
        spec = importlib.util.spec_from_file_location(name, cache_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod.launch(gridX, gridY, gridZ, launch_enter_hook, launch_exit_hook, metadata, *args)

    return launch
```
launch方法接受类似原生triton compiler的run方法的参数，如grid维度等，其中cu_function是核函数的lower ir，描述为asm汇编代码，总共编译两个文件，一个是刚刚生成的`main.cxx`代码，占位符被配置的核函数名替代；另一个是核函数`kernel.s`的asm代码。   
编译完成后的C模块被加载到python，模块的launch方法返回给`CPULauncher`的`self.launch`，调用`CompliedKernel`时会触发调用栈最终到该方法。每次触发上述`launch()`判断函数的hash code是否有变化，若有改变则要进行一次g++编译，注释中也说明了原因，因为不能像CUDA/HIP那样在不同的模块间传递函数指针，所以把核函数的asm代码加进来混合编译。

