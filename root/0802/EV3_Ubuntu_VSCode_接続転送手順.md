# EV3とUbuntuノートPCを接続し、VS CodeのPythonコードを転送する手順

## 1. この手順のゴール

この手順では、次の流れを構築します。

1. EV3で`ev3dev`を起動する
2. UbuntuノートPCとEV3をBluetoothまたはUSBで接続する
3. UbuntuからSSHでEV3へログインする
4. Ubuntu上のVS CodeでPythonコードを作成する
5. `scp`でPythonファイルをEV3へ転送する
6. SSH接続したEV3上でコードを実行する

> **重要：** VS CodeはUbuntu側で動かします。EV3は性能が限られているため、コードの編集はUbuntu、実行はEV3という役割分担にします。

---

## 2. 使用環境

- LEGO MINDSTORMS EV3
- EV3用microSDカード（16～32 GB程度）
- `ev3dev`を導入済みのEV3
- UbuntuノートPC
- Bluetooth、またはUSB Mini-Bケーブル
- VS Code
- Python 3

本書の例では、EV3側のユーザー名を`robot`、転送先を`/home/robot/projects`とします。

---

## 3. EV3側の事前準備

### 3.1 ev3devを用意する

まだ導入していない場合は、[ev3dev公式サイト](https://www.ev3dev.org/downloads/)からEV3用イメージを入手し、microSDカードへ書き込みます。そのmicroSDカードをEV3へ挿入して起動します。

### 3.2 EV3のユーザー情報

一般的な初期設定は次のとおりです。

| 項目 | 値 |
| --- | --- |
| ユーザー名 | `robot` |
| ホスト名 | `ev3dev` |
| 接続先候補 | `ev3dev.local`またはEV3のIPアドレス |

初期パスワードはev3devのバージョンによって異なる場合があります。初回ログイン後は、安全のため次のコマンドで変更してください。

```bash
passwd
```

---

## 4. Ubuntu側の事前準備

Ubuntuでターミナルを開き、SSHクライアントとホスト名解決に使うパッケージを確認・導入します。

```bash
sudo apt update
sudo apt install openssh-client avahi-daemon
```

インストール確認：

```bash
ssh -V
command -v scp
```

VS Codeが未導入の場合は、Ubuntu Softwareなどからインストールします。VS Codeを起動し、必要に応じて拡張機能の「Python」（Microsoft）も導入します。

---

## 5. EV3とUbuntuを接続する

接続方法は、BluetoothまたはUSBのどちらかを選びます。最初の動作確認にはUSBのほうが簡単で、ケーブルを使わず動かしたい場合はBluetoothが便利です。

## 5-A. Bluetoothで接続する

### 5-A-1. UbuntuでBluetoothを有効にする

Ubuntuの「設定」→「Bluetooth」を開き、Bluetoothをオンにします。

ターミナルから設定する場合は、次のように操作できます。

```bash
bluetoothctl
```

`bluetoothctl`内で次を入力します。

```text
power on
agent on
default-agent
scan on
```

一覧に`ev3dev`が表示されたら、EV3のMACアドレスを使ってペアリングします。

```text
pair A0:E6:F8:60:CE:B4
trust A0:E6:F8:60:CE:B4
connect A0:E6:F8:60:CE:B4
quit
```

> MACアドレス`A0:E6:F8:60:CE:B4`は例です。実際に表示されたEV3のアドレスへ置き換えてください。確認番号が両方の画面に表示されたら、UbuntuとEV3の双方で承認します。

### 5-A-2. EV3側でネットワーク接続を有効にする

EV3本体のメニューで、概ね次の順に操作します。

1. `Wireless and Networks`を開く
2. `Bluetooth`を開く
3. `Powered`と`Visible`を有効にする
4. UbuntuノートPCとペアリングする
5. ペアリングしたPCを選択する
6. `Connect`から`Network Access Point`を選択する

接続後、EV3の画面上部またはネットワーク情報画面にIPアドレスが表示されることを確認します。

### 5-A-3. 接続確認

Ubuntuのターミナルで、まずホスト名を使って確認します。

```bash
ping -c 4 ev3dev.local
```

応答がない場合は、EV3の画面に表示されたIPアドレスを使います。

```bash
ping -c 4 10.42.0.3
```

> `10.42.0.3`は例です。実際のEV3のIPアドレスへ置き換えてください。

## 5-B. USBで接続する

1. EV3のUSB Mini-B端子とUbuntuノートPCをケーブルで接続します。
2. UbuntuがEV3のUSBネットワークを認識するまで少し待ちます。
3. Ubuntuのターミナルで次を実行します。

```bash
ping -c 4 ev3dev.local
```

`ev3dev.local`を解決できない場合は、EV3の画面に表示されるUSB接続のIPアドレスを使います。

---

## 6. SSHでEV3へログインする

以下のコマンドは、**Ubuntu側のターミナル**で実行します。

```bash
ssh robot@ev3dev.local
```

IPアドレスを使う場合：

```bash
ssh robot@10.42.0.3
```

初回接続時に次のような確認が出たら、接続先が自分のEV3であることを確認して`yes`と入力します。

```text
Are you sure you want to continue connecting (yes/no)? yes
```

続いてEV3側の`robot`ユーザーのパスワードを入力します。ログイン後、プロンプトが次のように変われば成功です。

```text
robot@ev3dev:~$
```

PythonとEV3用ライブラリを確認します。

```bash
python3 --version
python3 -c "from ev3dev2.sound import Sound; print('ev3dev2 OK')"
```

最後に、転送先ディレクトリを作ります。

```bash
mkdir -p /home/robot/projects
exit
```

`exit`を実行するとEV3からログアウトし、Ubuntu側のターミナルへ戻ります。

---

## 7. VS CodeでPythonファイルを作成する

### 7.1 作業フォルダーを作る

Ubuntu側で次を実行します。

```bash
mkdir -p ~/ev3-project
code ~/ev3-project
```

VS Codeが開いたら、`beep_test.py`というファイルを作成します。

### 7.2 音を鳴らすテストコード

```python
#!/usr/bin/env python3
from ev3dev2.sound import Sound

sound = Sound()
sound.beep()
```

ファイルを保存します。

> Ubuntu側に`ev3dev2`が入っていない場合、VS Codeにインポートエラーの下線が表示されることがあります。実際にこのコードを実行するのはEV3側なので、EV3上でライブラリを読み込めれば動作します。

### 7.3 モーターを動かすテストコード

モーターをBポートとCポートへ接続し、`motor_test.py`を作成します。

```python
#!/usr/bin/env python3
from ev3dev2.motor import LargeMotor, OUTPUT_B, OUTPUT_C, SpeedPercent
from time import sleep

left_motor = LargeMotor(OUTPUT_B)
right_motor = LargeMotor(OUTPUT_C)

left_motor.on(SpeedPercent(30))
right_motor.on(SpeedPercent(30))
sleep(2)

left_motor.off()
right_motor.off()
```

> 実行前にEV3を床から浮かせるか、すぐ停止できる状態にして安全を確認してください。

---

## 8. VS Codeで作成したコードをEV3へ転送する

VS Codeの「ターミナル」→「新しいターミナル」を開きます。次のプロンプトが`ユーザー名@Ubuntu-PC`の形式になっており、**EV3へSSHログインした状態ではないこと**を確認してください。

### 8.1 1ファイルを転送する

VS Codeで開いているフォルダーが`~/ev3-project`なら、次を実行します。

```bash
cd ~/ev3-project
scp beep_test.py robot@ev3dev.local:/home/robot/projects/
```

IPアドレスを使う場合：

```bash
scp beep_test.py robot@10.42.0.3:/home/robot/projects/
```

### 8.2 複数のPythonファイルを転送する

```bash
scp *.py robot@ev3dev.local:/home/robot/projects/
```

### 8.3 プロジェクトフォルダー全体を転送する

```bash
scp -r ~/ev3-project robot@ev3dev.local:/home/robot/projects/
```

> `scp`の基本形は`scp 転送元 転送先`です。Ubuntu上のファイルをEV3へ送るため、コマンドはUbuntu側で実行します。

---

## 9. EV3上で転送したコードを実行する

Ubuntu側から再びSSH接続します。

```bash
ssh robot@ev3dev.local
```

転送されたファイルを確認して実行します。

```bash
cd /home/robot/projects
ls
python3 beep_test.py
```

モーターテストを実行する場合：

```bash
python3 motor_test.py
```

Pythonコードを更新したときは、次の流れを繰り返します。

1. UbuntuのVS Codeで編集・保存する
2. Ubuntuのターミナルで`scp`を実行する
3. SSH接続したEV3上で`python3 ファイル名.py`を実行する

---

## 10. `ev3`という短縮名を使えるようにする

次のコマンドは、SSH設定をしていない状態では失敗します。

```bash
scp test01.py ev3:/home/robot/
```

`ev3`というホスト名が登録されていないため、次のエラーになります。

```text
ssh: Could not resolve hostname ev3: Name or service not known
```

そのまま転送するなら、次のように正しいユーザー名とホスト名を指定します。

```bash
scp test01.py robot@ev3dev.local:/home/robot/projects/
```

短縮名`ev3`を使いたい場合は、Ubuntu側の`~/.ssh/config`へ次を追加します。

```sshconfig
Host ev3
    HostName ev3dev.local
    User robot
```

IPアドレスを使う場合は、`HostName`を実際のIPアドレスにします。

```sshconfig
Host ev3
    HostName 10.42.0.3
    User robot
```

設定後は次の短いコマンドを利用できます。

```bash
ssh ev3
scp test01.py ev3:/home/robot/projects/
```

---

## 11. よくあるエラーと対処法

### `Could not resolve hostname ev3`

原因：`ev3`という短縮名がSSH設定に登録されていません。

対処：`robot@ev3dev.local`または`robot@IPアドレス`を使うか、前節のSSH設定を追加します。

### `Could not resolve hostname ev3dev.local`

原因：EV3とネットワーク接続できていないか、`.local`の名前解決ができていません。

対処：

- Bluetoothの`Network Access Point`が接続済みか確認する
- USBケーブルを挿し直す
- EV3画面のIPアドレスを直接使う
- Ubuntuで`avahi-daemon`が動いているか確認する

```bash
systemctl status avahi-daemon
```

### `Connection timed out`または`No route to host`

原因：UbuntuとEV3が同じ接続経路上にいない、またはIPアドレスが変わっています。

対処：EV3のネットワーク画面で現在のIPアドレスを確認し、`ping`を試します。

### `Permission denied`

原因：ユーザー名またはパスワードが違います。

対処：ユーザー名が`robot`であることと、EV3側で設定したパスワードを確認します。

### `No such file or directory`

原因：Ubuntu側の転送元ファイル、またはEV3側の転送先ディレクトリが存在しません。

対処：

```bash
# Ubuntu側で転送元を確認
pwd
ls

# EV3側の転送先を作成
ssh robot@ev3dev.local "mkdir -p /home/robot/projects"
```

### `from: can't read /var/mail/ev3dev2.sound`

原因：PythonコードをLinuxのシェルへ直接入力しています。

誤った例：

```bash
robot@ev3dev:~$ from ev3dev2.sound import Sound
```

対処：Pythonの対話モードを開始してから入力するか、`.py`ファイルとして実行します。

```bash
python3
```

```python
from ev3dev2.sound import Sound
Sound().beep()
```

または：

```bash
python3 beep_test.py
```

### `ImportError: No module named 'ex3dev2'`

原因：ライブラリ名のタイプミスです。`ex3dev2`ではなく`ev3dev2`と記述します。

```python
from ev3dev2.sound import Sound
```

---

## 12. 毎回の基本操作まとめ

Ubuntu側のVS Codeでコードを保存した後、VS Codeのターミナルで次を実行します。

```bash
cd ~/ev3-project
scp beep_test.py robot@ev3dev.local:/home/robot/projects/
ssh robot@ev3dev.local
```

SSH接続後、EV3側で実行します。

```bash
cd /home/robot/projects
python3 beep_test.py
```

IPアドレスしか使えない環境では、すべての`ev3dev.local`をEV3に表示されたIPアドレスへ置き換えてください。
