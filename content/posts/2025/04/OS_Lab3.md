---
date: "2025-04-30T21:11:31+08:00"
draft: false
title: "BUAA_2025_OS_Lab3 上机总结"

tags: ["BUAA", "OS"]
categories: ["course"]
ShowWordCount: true
summary: 北航2025年操作系统Lab3上机题目回顾及分析
---
笔者好不容易通过一次 extra ，十分高兴，遂在此记录本次上机内容。上机前，依旧是参考了往年博客，了解到 extra 会考察异常处理，因此提前浏览了往届代码，学习异常处理的大体流程；此外，从原仓周老师班上的同学处获知消息，exam 会考察EDF调度算法，对照理论课课件也准备了一下。

## exam

课下我们在 MOS 系统中实现了时间片轮转算法（Round-Robin，RR）用于进程调度。在本题中，我们将实现最早截止时间优先算法（Earliest Deadline First，EDF），用于调度周期性进程。

---
题干中提示添加如下内容：

- 在 include/env.h 中添加声明：

    ```c
    LIST_HEAD(Env_edf_sched_list, Env);

    extern struct Env_edf_sched_list env_edf_sched_list; // EDF 调度队列

    struct Env *env_create_edf(const void *binary, size_t size, int runtime, int period);
    ```

- 在 include/env.h 中的`Env`结构体中添加必要字段：

    ```c
        LIST_ENTRY(Env) env_edf_sched_link; // 构造 env_edf_sched_list 的链表项
        u_int env_edf_runtime; // EDF 调度参数：进程在每个周期内需要运行的时间片
        u_int env_edf_period; // EDF 调度参数：进程的运行周期
        u_int env_period_deadline; // 进程当前周期的截止时间
        u_int env_runtime_left; // 进程当前周期剩余的时间片
    ```

- 在 kern/env.c 中添加`env_edf_sched_list`的定义，**并在`env_init`函数中初始化**`env_edf_sched_list`:

    ```c
    struct Env_edf_sched_list env_edf_sched_list;
    ```

    题干中只给出了`env_edf_sched_list`的定义，需要手动初始化一下。在`env_free_list`和`env_sched_list`的初始化代码下方调用`LIST`的初始化宏即可，很简单：
   
   ```c
   /* Exercise 3.1: Your code here. (1/2) */
	TAILQ_INIT(&env_sched_list);
	LIST_INIT(&env_free_list);
    LIST_INIT(&env_edf_sched_list);
    ```
---
基于以上内容，本题有两步需要实现：

1. 在 kern/env.c 中仿照`env_create`实现函数`env_create_edf`，用于创建周期性进程，并返回指向被创建进程的进程控制块的指针。参考如下：

    ```c
    struct Env *env_create_edf(const void *binary, size_t size, int runtime, int period) {
        ...
        e->env_edf_runtime = runtime;
        e->env_edf_period = period;
        e->env_period_deadline = 0; // 初始化为 0，使进程在首次调用 schedule 函数时触发条件判断，进入首个运行周期
        e->env_status = ENV_RUNNABLE;

        ...
    }
    ```

2. 修改 kern/sched.c 中的`schedule`函数，实现 EDF 调度算法。参考实现方式如下:

    ```c
    void schedule(int yield) {
        static int clock = -1; // 当前时间片，从 0 开始计数
        clock++;

        /* (1) 遍历 env_edf_sched_list，如果进程进入了新的运行周期（可通过 clock == env_p
        /* 在此实现你的代码 */
        /* (2) 遍历 env_edf_sched_list，选取 env_runtime_left 大于 0 且 env_period_dead
        /* 在此实现你的代码 */
        /* (3) 使用课下实现的 RR 算法调度 env_sched_list 中的进程。 */
        static int count = 0; // remaining time slices of current env
        struct Env *e = curenv; // 请根据提示修改这行代码
        /* 请将 Exercise 3.12 中的代码粘贴至此 */
    }
    ```

---
先分析较简单的`env_create_edf`，参照原版的`env_create`可以发现提示内容以外只剩两处需要改动：参数中无`priority`，不再需要给`env_pri`赋值（用 EDF 调度时也不需要该字段）；由于 EDF 算法不需要在队尾插入或取出的操作，因此我们推荐使用`LIST`结构实现 EDF 调度队列，因此最后一步将`e`加入`env_sched_list`所使用宏有所不同。最终代码如下：

```c
struct Env *env_create_edf(const void *binary, size_t size, int runtime, int period) {
	struct Env *e;
	panic_on(env_alloc(&e, 0));

	e->env_edf_runtime = runtime;
	e->env_edf_period = period;
	e->env_period_deadline = 0; // 初始化为 0，使进程在首次调用 schedule 函数时触发条件判断，进入首个运行周期
	e->env_status = ENV_RUNNABLE;

	load_icode(e, binary, size);
	LIST_INSERT_HEAD(&env_edf_sched_list, e, env_edf_sched_link);

	return e;
}
```
---
而对于调度算法的修改略微麻烦一点，先设置循环变量`struct Env *env`，之后按照提示一步步进行：

1. 遍历`env_edf_sched_lsit`内的进程进行必要的修改，其中更新`env_period_deadline`这一步题干中没有明确指出做法，但根据理论课知识和题面的相关知识，可以判断为自增`env->env_edf_period`：

    ```c
    LIST_FOREACH (env, &env_edf_sched_list, env_edf_sched_link) {
		if (clock == env->env_period_deadline) {
			env->env_period_deadline +=  env->env_edf_period;
			env->env_runtime_left = env->env_edf_runtime;
		}
	}
    ```

2. 二次遍历，并找出符合要求的进程：

    ```c
    // 提前设置好寻找最小值的变量和标记寻找成功的变量
    LIST_FOREACH (env, &env_edf_sched_list, env_edf_sched_link) {
		if (env->env_runtime_left > 0) {
			if (env->env_period_deadline < minddl || 
                env->env_period_deadline == minddl && env->env_id < minid) {
				minddl = env->env_period_deadline;
				minid = env->env_id;
				flag = 1;
				e = env;
			}
		}
	}
    ```

    随后进行调度，即减小`e->env_runtime_left`。笔者最初忘记这一步，导致本地测试总是无法在500次内调度完所有进程，但使用print法调试很快就能发现问题。

    ```c
    if (flag) {
        e->env_runtime_left--;
    }
    ```

3. 处理 EDF 算法调度失败的情况

    当`flag`为0时，需要使用课下实现的 RR 调度算法。
    
    > 题面提示：在课下代码中，我们定义`struct Env *e = curenv`，随后对`e`进行了一系列的判断和操作。在本题中，为了使 RR 算法的调度行为不受 EDF 抢占的影响，你可能需要适当修改这一设计，使`e`的初值为上次使用 RR 算法调度的进程，并在必要时新增**全局变量或静态变量**。

    这一提示的做法很常用，在往年也多次出现。具体来说，本题中设置一个`static struct Env *last`记录上次使用 RR 算法调度的进程即可。将`last`初始化为`NULL`，并记得在移除`e`时判断是否为`NULL`（即第一次调度）。笔者在这里又卡了一会，课后看水群里也有同学在这里遇到了问题。

    ```c
    if (!flag) {
		/* (3) 使用课下实现的 RR 算法调度 env_sched_list 中的进程。 */
        e = last == NULL ? curenv : last; // 这里似乎是多余的
		/* 请将 Exercise 3.12 中的代码粘贴至此 */
		if (yield || count == 0 || e == NULL || e->env_status != ENV_RUNNABLE) {
        	if (last != NULL && e != NULL && e->env_status == ENV_RUNNABLE) {
        	    TAILQ_REMOVE(&env_sched_list, e, env_sched_link);
        	    TAILQ_INSERT_TAIL(&env_sched_list, e, env_sched_link);
        	}
       		e = TAILQ_FIRST(&env_sched_list);
        	if (e == NULL) {
            	panic("schedule: no runnable envs\n");
        	}
        	count = e->env_pri;
        	last = e;
    	}
        count--;
	}
    ```

---
本次exam题目不算特别难，尤其是上机前准备充足的情况下，更应该对考察内容认识比较到位了。但笔者因为文中提到的几处“小问题”卡了很久，大约耗时1h15min才通过。😥 

## extra

课下实验中，我们主要介绍了异常的分发、异常向量组和 0 号异常（时钟中断）的处理过程。在本次 Extra 中，我们希望大家拓展 4 号异常 AdEL 和 5 号异常 AdES 的异常分发，并在此基础上实现自定义的异常处理。

经过CO的学习，我们知道导致这两种异常发生的原因可能是地址不对齐或违反访问权限。在本题中，只考虑**地址不对齐**导致的上述错误，且只考虑 lw 和 sw 指令（即必须四字节对齐）的情况。具体的响应方法如下：

通过修改相应的 lw 或 sw 指令，将未 4 字节对齐的地址的低 2 位（二进制格式下）置 0 ，得到符合对齐要求的地址。例如：对于地址0x7f000009，需要将其修改为0x7f000008（即修改后地址 new_addr = old_addr & ~0x3），方可得到符合要求的地址。注意，这里我们要求仅修改指令中的**立即数部分**，不要修改任何寄存器中的值。

在异常处理完成，返回用户态之前，需要输出相应信息：

- lw 处理完成：

    ```c
    printk("AdEL handled, new imm is : %04x\n", new_inst & 0xffff); // 这里的 new_inst 替换为修改后的指令
    ```

- sw处理完成：

    ```c
    printk("AdES handled, new imm is : %04x\n", new_inst & 0xffff); // 这里的 new_inst 替换为修改后的指令
    ```

---
阅读往年博客和本题提示，可以发现大体流程就是三步：

1. 在 kern/genex.S 中使用`BUILD_HANDLER`宏构建新的异常处理函数：
   
   ```c
   BUILD_HANDLER adel do_adel
   BUILD_HANDLER ades do_ades
   ```

2. 在 kern/traps.c 中声明`handle`函数并修改异常向量组：

    ```c
    extern void handle_adel(void);
    extern void handle_ades(void);

    // exception_handlers 请按以下代码实现
    void (*exception_handlers[32])(void) = {
        [0 ... 31] = handle_reserved,
        [0] = handle_int,
        [2 ... 3] = handle_tlb,
        [4] = handle_adel,
        [5] = handle_ades,
    #if !defined(LAB) || LAB >= 4
        [1] = handle_mod,
        [8] = handle_sys,
    #endif
    };
    ```

3. 在 kern/traps.c 中实现异常处理函数，下面我们以`do_adel`为例（`do_ades`几乎完全相同）：
    
    题面给出该函数的参数和提示：

    ```c
    void do_adel(struct Trapframe *tf) {
        // 在此实现相应操作以使修改后指令符合要求
    }
    ```

    > 本题涉及对寄存器值的读取。你需要访问保存现场的 Trapframe 结构体（定义在 include/trap.h 中）中对应通用寄存器。


    > 本题涉及对内存的访问，由于我们要修改的指令部分在 kuseg 区间，这一部分的虚拟地址需要通过 TLB 来获取物理地址。我们设置了程序中保存操作指令代码的.text节权限为只读，这部分空间在页表中仅被映射为 PTE_V，而不带有 PTE_D 权限，因此经由页表项无法对物理页进行写操作。可以考虑查询`curenv`的页表获取对应指令的物理地址，再转化为 kseg0的虚拟地址，从而修改相应内容。
    
    在上机前，我和舍友对比了2024年和2023年题目，发现流程差异巨大：前者十分简单，直接解引用`tf->cp0_epc`拿到指令进行修改即可，这是因为该题不要求修改受害指令，而是按照一定的格式直接处理数据，随后让 EPC + 4 进入下一条指令；后者较为繁琐，与今年题目一样，需要修改受害指令，因此需要走一遍提示中的流程。

    我参考2023年一位[学长的博客](https://cookedbear.top/p/20326.html)，得到如下取受害指令的代码：

    ```c
    u_int badva = tf->cp0_epc;

 	Pde *pgdir = curenv->env_pgdir;
	Pte **ppte = NULL;
	struct Page *p = page_lookup(pgdir, badva, ppte);
	u_int badpa = page2pa(p) + (badva & 0xfff);
	u_int *badk0va = 0x80000000 | badpa;
	u_int code = *badk0va;
    ```

    取出`base`、`regs[base]`和`imm`：

    ```c
    u_int base = (code & 0x3e00000) >> 21;
	u_int svalue = tf->regs[base];
 	u_int imm = (code & 0xffff);
    ```

    此后，按照题干要求的处理方法修改`imm`、写回`badk0va`并输出即可：

    ```c
    u_int oldaddr = svalue + imm;
 	u_int newaddr = oldaddr & ~0x3;
 	imm += newaddr - oldaddr;

	code = code & 0xffff0000 | (imm & 0xffff);
	*badk0va = code;
	printk("AdEL handled, new imm is : %04x\n", code & 0xffff)
    ```

    题目约束提到**不保证**`imm`为正数，但这里似乎不会造成什么影响，`imm`的变化完全取决于`newaddr`和`oldaddr`的差值，与`imm`本身的正负无关。

---
至此，我们就解决了本次上机的 extra 题目。在研究了前两年题目的前提下，完成本题的速度可以很快，笔者在 exam 耽误了许久，但还是提前交卷了；相反，如果是现场按照提示写取指流程，难免会有差错。可见，课下还是要做一些准备工作的。
