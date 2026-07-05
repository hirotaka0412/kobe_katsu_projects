
## 事前の準備
microUSBにEV3を動かすためのlinuxベースOSであるev3devをインストールする。（USBの容量は16~32
GB）

1. ev3devをインテリジェントブロックに読み込ませる
	microSDを使用。
	URLからev3devのOSデータをPCにインストール
		ev3devダウンロードページ：<https://www.ev3dev.org/downloads/>
	microSDを接続
	blenaEtcherを使ってev3devをmicroSDに書き込む : <https://etcher.balena.io>
	![[Pasted image 20260704143611.png]]
		
	microSDをインテリジェントブロックに差し込む
	一番サイズの大きいファイルを選択

2. PCとEV3を接続
	PCとEV3をSSHで接続
	SSHとは->PCから別のコンピュータに安全にログインして操作するための仕組み
	
	**BlueToothを使うやり方**
	
	1. EV3側でBlueToothをONにする
			EV3本体の画面で操作する。
			```
			Wireless and Networks
			↓
			Bluetooth
			↓
			Powered にチェック
			```
			上記の手順で接続
	2. BlueToothテザリングをONにする
		```
		Wireless and Networks
		↓
		Tethering
		↓
		Bluetooth にチェック
		```
	3. PC側でBlueToothをONにする
	4. EV3側からPCをスキャンする
		```
		Wireless and Networks
		↓
		Bluetooth
		↓
		Start Scan
		```
		しばらくするとPC名が表示され、表示されたPCを選択して`pair`を選ぶ。PC側にもペアリング確認が出る。EV3画面とPC画面に表示される番号を確認して両方で承認する。
	5. EV3側でIPアドレスを確認する。
		EV3で次を開く。
		```
		Wireless and Networks
		↓
		All Network Connections
		```
		Bluetooth接続に対応するIPアドレスを探す。次のようなものがよく見られる。
		```
		192.168.1.1
		10.0.1.1
		169.254.xxx.xxx
		```
	6. PowerShellからSSH接続する
		PowerShellを開いて以下のコマンドを打ち込む
		```powershell
		ssh robot@ev3dev.local
		```
		だめならEV3のIPアドレスで接続する。
		```powershell
		ssh robot@192.168.1.1
		```
		パスワードを入力する。パスワードは`maker`。
		ログインできれば成功。
	* **うまくいかない場合**
		WindowsでペアリングしただけだとSSHできない場合がある。**Bluetooth PAN** または **パーソナルエリアネットワーク** として接続する必要がある。
		以下のように探す。
		```
		コントロール パネル
		↓
		ハードウェアとサウンド
		↓
		デバイスとプリンター
		↓
		EV3を右クリック
		↓
		接続方法
		↓
		アクセスポイント
		```
		環境によっては
		```
		設定
		↓
		Bluetooth とデバイス
		↓
		デバイス
		↓
		その他のデバイスとプリンター
		↓
		EV3を右クリック
		↓
		接続方法
		↓
		アクセスポイント
		```
		な場合もある。
## EV3とPCをつなげる
USB-mini端子とUSB-A端子をもつケーブルを使用。（BlueTooth接続も可）

```PowerShell
PS C:\Users\hirot> ssh robot@ev3dev.local
(robot@ev3dev.local) Password:#パスワードは maker
Linux ev3dev 4.14.117-ev3dev-2.3.5-ev3 #1 PREEMPT Sat Mar 7 12:54:39 CST 2020 armv5tejl
             _____     _
   _____   _|___ /  __| | _____   __
  / _ \ \ / / |_ \ / _` |/ _ \ \ / /
 |  __/\ V / ___) | (_| |  __/\ V /
  \___| \_/ |____/ \__,_|\___| \_/

Debian stretch on LEGO MINDSTORMS EV3!
Last login: Fri Apr 10 20:19:38 2020 from fe80::6513:32b4:6916:b5f3%usb1
robot@ev3dev:~$ python3 --version
Python 3.5.3
robot@ev3dev:~$ from ev3dev2.sound import Sound
from: can't read /var/mail/ev3dev2.sound
robot@ev3dev:~$ python3
Python 3.5.3 (default, Sep 27 2018, 17:25:39)
[GCC 6.3.0 20170516] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>> from ev3dev2.sound import Sound
>>> sound = Sound()
>>> sound.beep()
>>> exit()
robot@ev3dev:~$
```

## EV3をPythonで動かしてみる

#### 作業手順：powershellで入力
1. ファイルを作成
	`nano [ファイル名（最後は.py固定）]`
2. エディタに移動するので以下のコードをコピー (ctrl + c)アンドペースト (ctrl + v)で記述した後、保存 
	(ctrl + o -> Enter -> ctrl + x)
3. `python3 ファイル名`で実行

**テスト１：音を鳴らす**

```python
# beep_test.py
from ev3dev2.sound import Sound  
  
sound = Sound()  
sound.beep()
```

**テスト２：まっすぐ進む**

```python
#motor_test.py
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

**PowerShell上の画面**
```powershell
robot@ev3dev:~$ python3 --version
Python 3.5.3
robot@ev3dev:~$ from ev3dev2.sound import Sound
from: can't read /var/mail/ev3dev2.sound
robot@ev3dev:~$ python3
Python 3.5.3 (default, Sep 27 2018, 17:25:39)
[GCC 6.3.0 20170516] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>> from ev3dev2.sound import Sound
>>> sound = Sound()
>>> sound.beep()
>>> exit()
robot@ev3dev:~$ nano beep_test.py
robot@ev3dev:~$ python3 beep_test.py
Traceback (most recent call last):
  File "beep_test.py", line 1, in <module>
    from ex3dev2.sound import Sound
ImportError: No module named 'ex3dev2'
robot@ev3dev:~$ nano beep_test.py
robot@ev3dev:~$ python3 beep_test.py
robot@ev3dev:~$ nano motor_test.py
robot@ev3dev:~$ python3 motor_test.py
```

# AIが命令を出すための準備

## 1. 基本動作を関数（コマンド）にする。

前進、後退、右折などの基本動作をコマンドにすることでAIが命令を下せるようにする。

### 最初に実装したい命令

|コマンド名 | 動作|
|---|---|
|forward  |前進|
|backward |後退|
|left  |左折|
|right  |右折|
|stop　|停止|
**具体的な実装内容**

```python
# robot_actions.py

from ev3dev2.motor import MoveTank, OUTPUT_B, OUTPUT_C, SpeedPercent
from time import sleep

tank = MoveTank(OUTPUT_B, OUTPUT_C)

def forward(seconds=1, speed=30):
    tank.on(SpeedPercent(speed), SpeedPercent(speed))
    sleep(seconds)
    tank.off()

def backward(seconds=1, speed=30):
    tank.on(SpeedPercent(-speed), SpeedPercent(-speed))
    sleep(seconds)
    tank.off()

def left(seconds=0.5, speed=30):
    tank.on(SpeedPercent(-speed), SpeedPercent(speed))
    sleep(seconds)
    tank.off()

def right(seconds=0.5, speed=30):
    tank.on(SpeedPercent(speed), SpeedPercent(-speed))
    sleep(seconds)
    tank.off()

def stop():
    tank.off()

if __name__ == "__main__":
    forward()
    backward()
    left()
    right()
    stop()
```

**コマンド入力でロボットを動かす**
```python
# command_robot.py
from robot_actions import forward, backward, left, right, stop  
  
print("EV3 command mode")  
print("Commands: forward, backward, left, right, stop, quit")  
  
while True:  
command = input("command> ").strip().lower()  
  
if command == "forward":  
forward()  
elif command == "backward":  
backward()  
elif command == "left":  
left()  
elif command == "right":  
right()  
elif command == "stop":  
stop()  
elif command == "quit":  
stop()  
break  
else:  
print("Unknown command:", command)
```

