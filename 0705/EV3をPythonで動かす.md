
## 事前の準備
microUSBにEV3を動かすためのlinuxベースOSであるev3devをインストールする。（USBの容量は16~32
GB）
ev3dev:<https://www.ev3dev.org/downloads/>
## EV3とPCをつなげる
USB-mini端子とUSB-A端子をもつケーブルを使用。（BlueTooth接続も可）

```PowerShell
PS C:\Users\hirot> ssh robot@ev3dev.local
(robot@ev3dev.local) Password:
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

