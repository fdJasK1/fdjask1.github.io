---
date: "2025-03-15T11:06:11+08:00"
draft: false
title: "BUAA_2025_OS_Lab0 上机总结"

tags: ["BUAA", "OS"]
categories: ["course"]
ShowWordCount: true
summary: 北航2025年操作系统Lab0上机题目回顾及分析
---
按照惯例，本次上机有exam和extra共两个题目。笔者和舍友在考前阅读了一些往年Lab0上机总结，与本次进行了对比。考后大家的普遍感受是题量偏多，难度较高。但也如助教所说，exam这道题完全是根据指导书出的，没有涉及超出要求的内容。

## exam

exam考察了gcc，Makefile和shell脚本相关的内容，共两大部分。

### gcc & Makefile

本部分与预习部分和线上实验包含的练习题目基本是一个套路，用gcc工具实现题干规定的目标。

1. 运行`make check`编译check.c文件，要求生成check.o而非可执行文件。

   两个需求分别对应-c选项和-o选项。

2. 检查是否完成目标`check`，然后运行`make`编译src目录下的main.c和output.c，生成可执行文件main。将main移动到out文件夹下。

   有运行`make`执行本目标的需求，因此要将本目标放置在第一个位置。
   
   `ls src`即可看到存在include文件夹，说明在gcc时需要-I选项指定头文件路径，记得考试期间助教也明确提醒过这一点。

   唯一要注意的就是要用相对路径，别写错了。笔者在一开始考试时没进入状态，卡了半天才发现是-I选项后的路径写成了`../src/include/`，浪费了挺多时间。

3. 检查out文件夹下是否有main，运行`make run`执行main。

4. 运行`make clean`清除out文件夹下的main。

```sh
all: 
	make check
	gcc -I./src/include/ src/*.c -o main
	mv main ./out

check: check.c
	gcc -c check.c -o check.o

run: out/main
	./out/main

clean:
	rm check.o out/main
```

### gcc & shell

本部分有9个需求，按照顺序完成9个shell脚本（exam_1.sh至exam_9.sh）即可，题干表述十分清晰。

> 下面所有的路径都默认工作目录在~/<学号>，即仓库根目录。

1. 创建名为result的文件夹，在其内部再创建code和backup两个文件夹。

   ```sh
   mkdir result
   mkdir result/code result/backup
   ```

   

2. 将origin路径下的basic.c中所有包含"hello"的行输出至命令行，区分大小写。

   ```sh
   grep "hello" origin/basic.c
   ```

   

3. 将origin路径下的basic.c移动至result路径下。

   ```sh
   mv origin/basic.c result/basic.c
   ```

   

4. 复制origin路径下的code文件夹及其内容，至result/backup路径下。

   ```sh
   cp -r origin/code result/backup
   ```

   

5. result/code路径下有21个.c文件，命名分别是0.c至20.c。将每个.c文件中含有的所有"REPLACE"替换为文件名中的数字，替换后的全文存入result/code下的同名文件。

   考察while循环和sed命令的使用，如忘记用法可随时查询指导书或用`man`命令。但尽量考前练习熟练，节约上机时间。

   ```sh
   i=0
   while [ $i -le 20 ]
   do
       sed "s/REPLACE/$i/g" origin/code/$i.c > result/code/$i.c
       let i=i+1
   done
   
   ```

   

6. 编译result/code路径下的所有.c文件，生成可执行文件verify放置于result路径下。

   ```sh
      gcc result/code/*.c -o result/verify
   ```

7. 执行形成的verify，将报错信息存入工作目录下的stderr.txt

   保险起见提前增加执行权限，以便测试。

   ```sh
   chmod +x result/verify
   ./result/verify 2>> stderr.txt
   ```

   

8. 更改stderr.txt权限为`r--r-----`

   ```sh
   chmod 440 stderr.txt
   ```

   

9. 题目保证`run_exam.sh`会以`bash exam_9.sh <digit> <digit>`的格式执行exam_9.sh。记后两个参数分别为l和r，保证l<r。两参数缺失情况共以下三种：

   1. l和r均缺失，则输出stderr.txt的全部内容至命令行。输出方式下同。
   2. 只缺失r，则从第l行开始输出至文件末尾。文件行数从1开始。
   3. l和r均不缺失，则从第l行开始输出至第r行（不包含第r行）。

   仍然是考察循环和sed命令的使用，比较基础。

   ```sh
   if [ $# -eq 0 ]; then
       cat stderr.txt
   elif [ $# -eq 1 ]; then
       i=$1
       while [ $i -le 21 ]
       do
           sed -n "$i p" stderr.txt
           let i=i+1
       done
   elif [ $# -eq 2 ]; then
       i=$1
       while [ $i -lt $2 ] 
       do
           sed -n "$i p" stderr.txt
           let i=i+1
       done
   fi
   
   ```

---

现在回看，exam部分考察的确实是基础知识的运用，没有很难的点。但上机时多少因为紧张，代码细节部分出现漏洞，导致频繁修改和debug，最终花了55分钟才把exam搞定。

   

## extra

本题的情景是编写一个简单地代码评测装置，共5个小模块。时间原因笔者最后只看了前4个（本次考试没有延长时间），第4个还没来得及写完就到时间了。

题干末尾提示了完成本道题需要用到的一些额外shell语法，包括for循环遍历字符串中的单词、判断字符串相同等。这些内容在下方的代码中已被注明。

### genCode.sh

代码评测装置收到了许多代码，存放在code路径下，文件名格式是[basename].sy。

在评测前，要对这些代码进行一定处理！

1. 创建名为codeSet的文件夹。
2. 把code路径下的所有.sy文件进行如下处理：
   1. 第一行前加入#include"include/libsy.h"。
   2. 把所有"getInt"替换为"getint"。
   3. 不修改原文件，而是将修改后的全文存入codeSet路径下的[basename].c文件。

```sh
mkdir codeSet
for file in `cd code; ls *.sy` #有相关提示
do
    echo $file > logabc
    newfile=`awk -F. '{print $1}' logabc` 
    touch ./codeSet/$newfile.c
    echo "#include\"include/libsy.h\"" > codeSet/$newfile.c #记得给双引号转义
    sed 's/getInt/getint/g' code/$file >> codeSet/$newfile.c
done
```



上机结束后，发现一些同学做extra时直接卡在了这道题。评测逻辑要求先能正确实现genCode，再检查后续题目的正确性，因此这导致了后面的题目都无法得分。这道题一开始也同样困扰了我：

提示告诉我们，给for循环一个字符串，似乎会自动按照空格拆分。因此我用下面的做法可以成功提取文件名⬇

```sh
for file in `cd code; ls *.sy`
```

怎样提取[basename]呢？感觉涉及到了字符串处理，乍一想之前好像没有遇到过。我只知道处理文件时，可以使用awk的-F选项分隔，因此在上机时使用了很蹩脚的方式：把`$file`存入文件再awk提取出[basename]。这样做是可行的，但实在是不太优雅。事实上，有一个命令就叫`basename`，其-s选项可以移除后缀。使用`basename -s .sy $file`即可提取出[basename]。

> OS上机不同于CO上机，可以参考大量资料，但这也不意味着平时一点拓展内容都不用研究。考场上，如果你知道有这样一个命令，自然可以很快地解决问题；如果你不知道这个命令，即使它就躺在/bin/路径里，用man命令就可以了解其用法，你也想不到有这个命令，只能用自己的笨办法低效地解决问题。



### selectCode.sh

处理完代码之后，选择需要评测的代码进行编译。保证以`bash selectCode.sh [basename]`的格式执行selectCode.sh。

1. 检查是否已存在testfile.c，如果有则将其删除。
2. 创建名为testfile.c的软链接，源文件是是codeSet路径下的[basename].c。
3. 编译testfile.c生成可执行文件test.out。

```sh
if [ `find -name testfile.c` ];
then
    rm testfile.c
fi
ln -s codeSet/$1.c testfile.c #有相关提示
gcc -I./include testfile.c -o test.out

```

本题没出什么岔子，按照提示给的语法创建链接即可。



### selectData.sh

所有用于测试的数据都放在data路径下，被分为a、b和c三个等级，命名格式为[level]_[basename].in（后缀也可以是.out）。保证以`bash selectData.sh [level]`的格式执行selectCode.sh。

1. 创建名为dataSet的文件夹。
2. 如果[level]是"a"或"b"或"c"，则将data路径下对应等级的.in和.out文件复制到dataSet中，不改名。
3. 如果[level]是"all"，则将data路径下所有.in和.out文件复制到dataSet中，不改名。

```sh
mkdir dataSet
if [ "$1" = "all" ]; then #有相关提示
    cp data/*.in dataSet
    cp data/*.out dataSet
elif [ "$1" = "a" ]; then
    cp data/a*.in dataSet
    cp data/a*.out dataSet
elif [ "$1" = "b" ]; then 
    cp data/b*.in dataSet
    cp data/b*.out dataSet
else
    cp data/c*.in dataSet
    cp data/c*.out dataSet
fi

```

关于判断字符串相同的语法已经给出了提示，没有困难。使用好通配符即可。



### testProgram.sh

开始进行测试。

1. 创建名为output的文件夹。

2. 清空testRes.txt内的内容。

3. 执行test.out，每次从dataSet中的一个[level]\_[basename].in获取输入，输出存入output路径下的[level]_[basename].out。

   如果运行结果和dataSet中的[level]\_[basename].out完全一致，则**追加**写入"[level]\_[basename] 1"进入testRes.txt，反之则追加写入"[level]\_[basename] 0"。

4. 如果所有测试点全部正确，在testRes.txt第一行之前加一个"1"，否则加一个"0"。

```sh
mkdir output
echo "" > testRes.txt
cd dataSet
flag=1
for file in `ls *.in`
do
    echo $file > logabc
    newfile=`awk -F. '{print $1}' logabc`
    ../test.out < $file > ../output/$newfile.out
   if [[ `diff -q ../output/$newfile.out ./$newfile.out` -eq 0 ]]; #不太记得此处是否有提示
   then
       echo "$newfile 1" >> ../testRes.txt
   else
       echo "$newfile 0" >> ../testRes.txt
       let flag=flag+1
   fi
done
cd ..
if [ $flag -eq 1 ]; then
    cat testRes.txt > temp11
    printf 1 > testRes.txt
    cat temp11 >> testRes.txt
else
    cat testRes.txt > temp11
    printf 0 > testRes.txt
    cat temp11 >> testRes.txt
fi
```

我在上机时沿用了genCode.sh中去除后缀的方法，显得较为臃肿。因为时间不够，本题代码没有提交评测，因此其正确性不得而知。

## 总结

完成Lab0线上实验时，我对于`grep`、`sed`和`awk`这几个命令的掌握程度很差，每次要用都得查询指导书或问AI。因此，考前我着重对这几个命令进行了准备，对上机时还是很有帮助的。

总得来说，题目的强度有点超出我的预料。有的同学感觉十分坐牢，我倒是一直在推进进度，体验还好。就是速度和准确性有待提升！



















