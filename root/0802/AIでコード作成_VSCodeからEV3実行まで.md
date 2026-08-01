# AIでコードを作り、VS CodeからEV3で実行する手順

この手順書では、次の流れを説明します。

> AIでPythonコードを作る → VS Codeへ貼り付けて保存 → `ssh`で接続確認 → `scp`でEV3へ送る → 再び`ssh`でEV3へ入る → `python3`で実行する

## 1. この手順の前提

| 項目 | この手順で使う値 |
| --- | --- |
| コードを編集するPC | Ubuntu |
| エディター | VS Code |
| Ubuntu側の作業フォルダー | `~/ev3-project` |
| Pythonファイル名 | `test01.py` |
| EV3のユーザー名 | `robot` |
| EV3のホスト名 | `ev3dev.local` |
| EV3側の保存場所 | `/home/robot/projects` |

EV3のIPアドレスを使う環境では、`ev3dev.local`を実際のIPアドレスに置き換えてください。

> **重要:** コマンドの前に表示される`hiro@ubuntu:...$`や`robot@ev3dev:...$`はプロンプトです。自分で入力する部分ではありません。

## 2. 全体の流れ

| 段階 | 操作する場所 | 作業 |
| --- | --- | --- |
| 1 | AIのチャット画面 | EV3用のPythonコードを作成する |
| 2 | UbuntuのVS Code | コードを貼り付け、`test01.py`として保存する |
| 3 | Ubuntuのターミナル | `ssh`でEV3への接続を確認する |
| 4 | Ubuntuのターミナル | `scp`でファイルをEV3へ送る |
| 5 | Ubuntuのターミナル | `ssh`でEV3へログインする |
| 6 | EV3のターミナル | `python3 test01.py`を実行する |
| 7 | EV3のターミナル | `exit`でUbuntuへ戻る |

## 3. AIにコードを作ってもらう

AIには、作りたい動作だけでなく、EV3の環境や安全条件も伝えます。

### 依頼文の例

```text
LEGO MINDSTORMS EV3用のPythonコードを作成してください。

環境:
- OS: ev3dev
- Python: 3.5.3
- ライブラリ: python-ev3dev2
- 左モーター: OUTPUT_B
- 右モーター: OUTPUT_C

動作:
- 速度30%で1秒前進する
- 動作後は必ずモーターを停止する

安全条件:
- 速度は30%以下
- try/finallyを使い、エラーやCtrl+Cでもモーターを停止する
- Python 3.5.3で使えない新しい構文は使わない

test01.pyとして保存できる完成コードだけを、Pythonのコードブロックで出力してください。
```

AIがコードを出力したら、説明文ではなく、Pythonのコードブロック内だけをコピーします。

## 4. VS Codeへ貼り付けて保存する

1. UbuntuでVS Codeを開きます。
2. `~/ev3-project`フォルダーを開きます。
3. 新しいファイルを作り、名前を`test01.py`にします。
4. AIが作成したコードを貼り付けます。
5. `Ctrl+S`で保存します。

作業フォルダーがまだない場合は、Ubuntuのターミナルで次を実行します。

```bash
mkdir -p ~/ev3-project
code ~/ev3-project
```

## 5. Ubuntu側で現在地とファイルを確認する

VS Codeで「ターミナル」→「新しいターミナル」を開きます。次のように、`@`の右側が`ubuntu`になっていることを確認してください。

```text
hiro@ubuntu:~/ev3-project$
```

続けて、Ubuntu側で次のコマンドを実行します。

```bash
cd ~/ev3-project
pwd
ls
```

確認することは次の2点です。

- `pwd`の結果が`/home/ユーザー名/ev3-project`になっている
- `ls`の結果に`test01.py`が表示される

## 6. `ssh`でEV3への接続を確認する

このコマンドは**Ubuntu側**で実行します。

```bash
ssh robot@ev3dev.local
```

初回接続時に接続先の確認が表示されたら`yes`と入力します。パスワードを求められた場合は、EV3の`robot`ユーザーのパスワードを入力します。

接続に成功すると、プロンプトの`@`の右側が`ubuntu`から`ev3dev`へ変わります。

```text
接続前: hiro@ubuntu:~/ev3-project$
接続後: robot@ev3dev:~$
```

初回だけ、EV3側でコードの保存フォルダーを作成します。

```bash
mkdir -p /home/robot/projects
```

## 7. `scp`でコードをEV3へ送る

この操作は、必ず**Ubuntu側**で行います。ターミナルで新しいタブを作成してください。

```bash
scp test01.py robot@ev3dev.local:/home/robot/projects/
```

パスワードを求められた場合は、EV3の`robot`ユーザーのパスワードを入力します。入力中は文字が画面に表示されませんが、そのまま入力してEnterを押してください。

## 8. EV3側でコードを実行する

送信後、Ubuntu側から再びEV3へログインします。

```bash
ssh robot@ev3dev.local
```

プロンプトが`robot@ev3dev:...$`へ変わったことを確認してから、次のコマンドを実行します。

```bash
cd /home/robot/projects
pwd
ls
python3 test01.py
```

確認することは次の3点です。

- `pwd`の結果が`/home/robot/projects`になっている
- `ls`の結果に`test01.py`が表示される
- EV3がAIへ依頼した内容どおりに動作する

プログラムを途中で止める場合は`Ctrl+C`を押します。終了後、Ubuntu側へ戻るには次を実行します。

```bash
exit
```

プロンプトが`hiro@ubuntu:...$`へ戻れば、EV3からログアウトできています。

## 9. コードを修正して再実行する

コードを修正するときは、次の流れを繰り返します。

1. UbuntuのVS Codeで`test01.py`を修正する
2. `Ctrl+S`で保存する
3. Ubuntu側のプロンプトで`scp`を実行する
4. Ubuntu側のプロンプトで`ssh`を実行する
5. EV3側のプロンプトで`python3 test01.py`を実行する
6. EV3側で`exit`を実行し、Ubuntuへ戻る

```bash
# Ubuntu側
cd ~/ev3-project
scp test01.py robot@ev3dev.local:/home/robot/projects/
ssh robot@ev3dev.local

# ここからEV3側
cd /home/robot/projects
python3 test01.py
exit
```

> `# Ubuntu側`などの行は説明用のコメントです。コピーして実行しても問題ありませんが、プロンプトを見ながら1行ずつ実行するほうが安全です。

## 10. よくあるエラー

### `test01.py: No such file or directory`

現在地またはファイル名が違います。

```bash
pwd
ls
```

で確認してください。

### `Permission denied`

ユーザー名またはパスワードを確認します。EV3のユーザー名は通常`robot`です。

### EV3に送ったはずなのに古い動作をする

VS Codeで保存してから`scp`を実行したか確認します。また、Ubuntu側とEV3側の両方で`pwd`と`ls`を確認してください。

### `python3`実行後にモーターが止まらない

まず`Ctrl+C`で停止します。すぐにEV3を安全に停止できる状態で実習し、車輪を床から浮かせた状態で初回テストを行ってください。AIへコードを依頼するときは、`try/finally`で必ずモーターを停止する条件を含めます。

## 11. 実行前チェックリスト

- [ ] AIへEV3のPythonバージョン、ポート、安全条件を伝えた
- [ ] VS Codeで`test01.py`を保存した
- [ ] Ubuntu側で`pwd`と`ls`を確認した
- [ ] `ssh`でEV3への接続を確認し、`exit`でUbuntuへ戻った
- [ ] Ubuntu側から`scp`を実行した
- [ ] 送信後、Ubuntu側から再び`ssh`を実行した
- [ ] プロンプトが`robot@ev3dev:...$`へ変わった
- [ ] EV3側で`pwd`と`ls`を確認した
- [ ] EV3を安全に停止できる状態にした
- [ ] EV3側で`python3 test01.py`を実行した
- [ ] 終了後に`exit`でUbuntuへ戻った

## 12. 覚えるポイント

```text
AI       : コードを作る
VS Code  : Ubuntu上でコードを編集・保存する
scp      : UbuntuからEV3へファイルを送る
ssh      : UbuntuからEV3へログインする
python3  : EV3上でプログラムを実行する
exit     : EV3からログアウトしてUbuntuへ戻る
```

コマンドを打つ前に、次の3点を確認します。

> **どのPCか → どの場所か → 何をするか**

## 参考資料

- [共有チャット](https://chatgpt.com/share/6a6e38da-316c-83ee-99d4-7acfc2f72235)
- [Ubuntu: The Linux command line for beginners](https://documentation.ubuntu.com/desktop/en/latest/tutorial/the-linux-command-line-for-beginners/)
- [OpenSSH ssh manual](https://man.openbsd.org/cgi-bin/man.cgi/OpenBSD-current/man1/ssh.1)
- [OpenSSH scp manual](https://man.openbsd.org/scp.1)
