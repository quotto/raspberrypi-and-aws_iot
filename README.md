## このプログラムについて
センサーデバイスから取得した温湿度データをAWS IoT Core経由でAmazon TimeStreamに保存、ウェブから可視化するプログラム一式です。

- [raspberryp](./raspberrypi) :ラズパイに接続したDHT22から温湿度を取得して、IoT Coreのトピックにpublishするプログラム
- [backend](./backend): Amazon TimeStreamから時系列の温湿度データを取り出す
- [frontend](./frontend): でバックエンドから取得したデータをChart.jsでグラフ描画する