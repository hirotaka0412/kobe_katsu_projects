# AIでのコード作成

1. 以下の環境要件をコピーアンドペーストで記述する。(右上の`text`をクリックでコピー)
	```text
	これから指示する動作を以下の環境で再現するプログラムを作成してください。
	- EV3側OS：ev3dev（Debian Stretch）
	- Python：3.5.3
	- ライブラリ：`python-ev3dev2`（import名は`ev3dev2`）
	- 左モーター：ポートB（`OUTPUT_B`）
	- 右モーター：ポートC（`OUTPUT_C`）
	- PC：Ubuntu
	- EV3ユーザー名：`robot`
	- 実行場所：PCではなくEV3上
	```
2. 実現したい動作を入力する。（～cm直進して、90度右折して、など）
	イメージ図
	![[Pasted image 20260912163149.png]]

---
# EV3にコードを転送
1. パソコン画面からアプリケーション画面を開き「端末」をクリック。コマンド入力画面が開く。
2. USB-mini端子を持つケーブルでレゴロボットとPCをつなぐ。
3. 以下コマンドを入力
	```powershell
	ssh robot@ev3dev.local
	```
	パスワード入力画面が出力される。
	```text
	(robot@ev3dev.local) Password:
	```
	ここで`maker`と入力。
	成功パターン
```PowerShell
Linux ev3dev 4.14.117-ev3dev-2.3.5-ev3 #1 PREEMPT Sat Mar 7 12:54:39 CST 2020 armv5tejl
             _____     _
   _____   _|___ /  __| | _____   __
  / _ \ \ / / |_ \ / _` |/ _ \ \ / /
 |  __/\ V / ___) | (_| |  __/\ V /
  \___| \_/ |____/ \__,_|\___| \_/

Debian stretch on LEGO MINDSTORMS EV3!
Last login: Fri Apr 10 20:19:38 2020 from fe80::6513:32b4:6916:b5f3%usb1
```
	
	これで実際に操作しているのはレゴブロックになった。
4. プログラムファイルを作成
	1. 以下の形式でファイルを作成。
		```PowerShell
		nano [ファイル名（最後は.py固定）]
		```
	2. エディタに移動するのでAIで作成したコードをコピー (ctrl + c)アンドペースト (ctrl + v)で記述した後、保存 (ctrl + o -> Enter -> ctrl + x)
	3. `python3 [ファイル名]`で実行

# サンプルコード
困ったらこれを実行してみてください。音声を再生するプログラムです。

ファイル名：beep.py
```python
from ev3dev2.sound import Sound  
  
sound = Sound()  
sound.beep()
```


