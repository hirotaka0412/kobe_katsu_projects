# EV3用Pythonコード生成ガイド（AI向け・簡易版）

この文書を前提として、LEGO MINDSTORMS EV3を動かすPythonコードを作成してください。

## 環境

- EV3側OS：ev3dev（Debian Stretch）
- Python：3.5.3
- ライブラリ：`python-ev3dev2`（import名は`ev3dev2`）
- 左モーター：ポートB（`OUTPUT_B`）
- 右モーター：ポートC（`OUTPUT_C`）
- PC：Ubuntu
- EV3ユーザー名：`robot`
- 実行場所：PCではなくEV3上

## コード生成時の規則

1. Python 3.5.3で動くコードにする。
2. f文字列、`dataclasses`、`match/case`など、新しいPythonの機能を使わない。
3. EV3の制御には`ev3dev2`を使う。他のEV3用APIを混在させない。
4. 初回テストは速度30%以下、連続動作2秒以下にする。
5. `try`と`finally`を使い、正常終了・例外・`Ctrl+C`のどの場合もモーターを停止させる。
6. 無限に走り続けるコードを作らない。ループには終了方法を設ける。
7. センサーや追加モーターを使う場合、種類と接続ポートが不明なら質問する。推測しない。
8. コード、ファイル名、転送コマンド、実行コマンドを簡潔に示す。

## 基本コード

次の形を基準にしてください。

```python
# robot_actions.py
from time import sleep
from ev3dev2.motor import MoveTank, OUTPUT_B, OUTPUT_C, SpeedPercent

tank = MoveTank(OUTPUT_B, OUTPUT_C)


def move(left_speed, right_speed, seconds):
    if max(abs(left_speed), abs(right_speed)) > 30:
        raise ValueError("speed must be 30 or less")
    if seconds < 0 or seconds > 2:
        raise ValueError("seconds must be between 0 and 2")

    try:
        tank.on(SpeedPercent(left_speed), SpeedPercent(right_speed))
        sleep(seconds)
    finally:
        tank.off(brake=True)


def forward(seconds=1, speed=30):
    move(speed, speed, seconds)


def backward(seconds=1, speed=30):
    move(-speed, -speed, seconds)


def left(seconds=0.5, speed=30):
    move(-speed, speed, seconds)


def right(seconds=0.5, speed=30):
    move(speed, -speed, seconds)


def stop():
    tank.off(brake=True)


if __name__ == "__main__":
    try:
        forward()
    except KeyboardInterrupt:
        pass
    finally:
        stop()
```



## AIへの依頼欄

```text
作りたい動作：
使用するモーター・センサー：
接続ポート：
速度・動作時間：
停止条件：
```

情報が足りない場合は、安全性や配線に関係する点だけ質問してください。
