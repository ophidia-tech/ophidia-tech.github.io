# Ophidia Technologies
# Class wrapper for pygatt BLE library
# 6 Oct 2021 -- lixiii

# Must be run as sudo to have access to BLE peripheral
import pygatt
from pygatt.backends import BLEAddressType
import asyncio
import time


class Bluetooth:
    def __init__(self, debug=False, printNotifications=True) -> None:
        self.connected = False
        self._polling = False
        self.printNotifications = printNotifications
        self._debug = debug
        self._adaptor = pygatt.GATTToolBackend(search_window_size=2048)
        self._adaptor.start()

    def _info(self, msg):
        if self._debug:
            print("[INFO] " + msg)
        else:
            pass

    def _warn(self, msg):
        if self._debug:
            print("[WARN] " + msg)
        else:
            pass

    def callback(self, handle, value):
        """
        Indication and notification come asynchronously, we use this function to
        handle them either one at the time as they come.
        :param handle:
        :param value:
        :return:
        """
        if self.printNotifications:
            print("Notification data received from BLE")
            print("Data: {}".format(value.decode("utf-8")))
            print("Handle: {}".format(handle))
        self.notification = (handle, value)
        self._polling = False
        self._polling_start_t = 0

    def scan(self, timeout: int = 1) -> list:
        self._info("Scanning for BLE devices...")
        results = self._adaptor.scan(timeout)
        self._info(str(results))
        return results

    def connect(self, macAddress: str, timeout: int = 5):
        """
            On successful connection, will register callback using self.callback for incoming notifications.
            To override default behaviour, simply redefine object.callback before calling connect.
        """
        self.macAddress = macAddress
        self._info(
            f"Attempt to conenct to device with MAC address: {macAddress}")
        try:
            self._device = self._adaptor.connect(macAddress,
                                                 address_type=BLEAddressType.random,
                                                 timeout=timeout)
        except Exception as e:
            raise e
        self.connected = True
        self._info(
            "Connection successful. Subscribing to notification service.")
        self._device.subscribe("0f1d0003-2021-aaaa-aaaa-0f1d1aaaaaaa",
                               callback=self.callback,
                               indication=False,
                               wait_for_response=False)

    def send(self, data: bytes, timeout: int = 1):
        self._polling = True
        self._polling_start_t = time.time()
        self._device.char_write_handle(13, data, timeout=timeout,
                                       wait_for_response=False)

    def disconnect(self):
        if self.connected:
            self._device.disconnect()
            self.connected = False

    def stop(self):
        self._adaptor.stop()

    def polling(self, timeout=3):
        while True:
            if self._polling == False:
                return
            if (time.time() - self._polling_start_t) > timeout:
                if self._polling == False:
                    return
                raise TimeoutError
