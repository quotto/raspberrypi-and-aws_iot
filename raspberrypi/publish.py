# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0.

import argparse
from awscrt import io, mqtt, auth, http
from awsiot import mqtt_connection_builder
import sys
import threading
import time
from uuid import uuid4
import json

import board
import adafruit_dht

from datetime import timezone,datetime
from math import trunc

# IoT Core用の引数
parser = argparse.ArgumentParser(description="Send and receive messages through and MQTT connection.")
parser.add_argument('--endpoint', required=True, help="Your AWS IoT custom endpoint, not including a port. " +
                                                      "Ex: \"abcd123456wxyz-ats.iot.us-east-1.amazonaws.com\"")
parser.add_argument('--cert', help="File path to your client certificate, in PEM format.")
parser.add_argument('--key', help="File path to your private key, in PEM format.")
parser.add_argument('--root-ca', help="File path to root certificate authority, in PEM format. " +
                                      "Necessary if MQTT server uses a certificate that's not already in " +
                                      "your trust store.")
parser.add_argument('--client-id', default="test-" + str(uuid4()), help="Client ID for MQTT connection.")
parser.add_argument('--topic', default="tpic_1", help="Topic to subscribe to, and publish messages to.")
parser.add_argument('--count', default=10, type=int, help="Number of messages to publish/receive before exiting. " +
                                                          "Specify 0 to run forever.")
parser.add_argument('--verbosity', choices=[x.name for x in io.LogLevel], default=io.LogLevel.NoLogs.name,
    help='Logging level')


args = parser.parse_args()

io.init_logging(getattr(io.LogLevel, args.verbosity), 'stderr')

# IoT Core接続エラー時のコールバック
def on_connection_interrupted(connection, error, **kwargs):
    print("Connection interrupted. error: {}".format(error))


# IoT Core再接続時のコールバック
def on_connection_resumed(connection, return_code, session_present, **kwargs):
    print("Connection resumed. return_code: {} session_present: {}".format(return_code, session_present))

if __name__ == '__main__':
    # DHT22の指定したピンを取得
    # DATピンを変えた場合はboard.Dnnの部分を対象のピン番号に変更
    dht_Device = adafruit_dht.DHT22(board.D23)

    # IoT Core接続
    event_loop_group = io.EventLoopGroup(1)
    host_resolver = io.DefaultHostResolver(event_loop_group)
    client_bootstrap = io.ClientBootstrap(event_loop_group, host_resolver)

    mqtt_connection = mqtt_connection_builder.mtls_from_path(
        endpoint=args.endpoint,
        cert_filepath=args.cert,
        pri_key_filepath=args.key,
        client_bootstrap=client_bootstrap,
        ca_filepath=args.root_ca,
        on_connection_interrupted=on_connection_interrupted,
        on_connection_resumed=on_connection_resumed,
        client_id=args.client_id,
        clean_session=False,
        keep_alive_secs=6)

    print("Connecting to {} with client ID '{}'...".format(
        args.endpoint, args.client_id))

    connect_future = mqtt_connection.connect()

    # 接続を待機する
    connect_future.result()
    print("Connected!")

    # 指定の回数だけIoT Coreのトピックへpublishする
    publish_count = 1
    while (publish_count <= args.count) or (args.count == 0):
        timestamp = trunc(datetime.now(tz=timezone.utc).timestamp())

        # DHT22センサーから温度と湿度を取り出す
        message={"temp": round(dht_Device.temperature,1),"humidity": round(dht_Device.humidity,1), "timestamp": timestamp}
        print("Publishing message to topic '{}': {}".format(args.topic, json.dumps(message)))

        mqtt_connection.publish(
            topic=args.topic,
            payload=json.dumps(message),
            qos=mqtt.QoS.AT_LEAST_ONCE)
        time.sleep(1)
        publish_count += 1

    # 切断
    print("Disconnecting...")
    disconnect_future = mqtt_connection.disconnect()
    disconnect_future.result()
    print("Disconnected!")
