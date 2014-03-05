# oculus menu

Use your oculus rift without a controller or keyboard. Tap the headset to navigate up and down a menu system with this tech demo.

Screenshot of EXCITING tech demo boxes:
![](https://raw.github.com/nickoneill/oculus-menu/master/img/screenshot.png)

And the demo video:
http://youtu.be/HU7HOWj04Bw

## requirements

Grab the oculus bridge app (binaries for osx and Windows) from this project: [https://github.com/Instrument/oculus-bridge](https://github.com/Instrument/oculus-bridge)

The bridge connects the data from the rift to a local websocket connection. Accelerometer, orientation and configuration data is sent through this connection so you can use the rift with web technologies like Three.js like I do here.

Getting started with the rift in javascript using Three.js is many times easier for programmers who aren’t familiar with C++, I highly recommend this method for people who want to get started on the rift in a short amount of time.

And you should have a rift…

## the demo

Launch the bridge app and make sure your oculus rift is plugged in. The bridge app should have the “oculus” button filled in.

Open [http://nickoneill.github.io/oculus-menu/](http://nickoneill.github.io/oculus-menu/) in a web browser (I developed it in chrome, it should work on any modern browser). The “websockets” button on the bridge app should now be filled in.

Tap the number “0” on your keyboard to switch to rift output mode, then move the window to your rift however you normally do it.

I like to use [SizeUp](https://www.irradiatedsoftware.com/sizeup/) (on osx) when developing so I can quickly send the window to the rift screen (ctrl+opt+right arrow for send window to next screen) and then go full screen (shift-command-f).

You should be able to tap on the right side of the rift  to navigate up and down the menus. Sometimes it helps to hold the left side lightly with your left hand when you tap (see [the video](https://www.youtube.com/watch?v=HU7HOWj04Bw)).

## the code

The code stores a few recent calculations of the derivative in the horizontal direction (x or y, depending on if you’re in the rift or three.js sections) and compares the newest data against a weighted average of recent points. If it is greater than the weighted average then we go through the song and dance of seeing if the thing we’re looking at intersects with a menu object.

There’s some code to look backwards and forwards in time for the maximum acceleration. I intended on using this to detect the direction of tap until I realized the data wasn’t fast enough (see below) so looking forward shouldn’t ever change the data. It’s a good place to start if you wanted to add that though.

Also, the data coming from the SensorFusion object in the bridge is limited to 60Hz. 60Hz is actually pretty slow for accelerometer data (the hardware is capable of at least 1000Hz) and you can see in some of the charts (see below) that we occasionally get accelerometer data that seems to skip a data point (notably when it’s one side or the other of a tap - a big jolt and return that skips either the initial jolt or the return to the other side). We could potentially hook up to the raw sensor data with the bridge app, but it wasn’t necessary for this. If you want to get really sensitive and be able to tell taps on the left side from taps on the right side, you probably need the raw data.

## extras

There’s some code for testing and charting different algorithms for detecting taps. It’s in [chart.html](http://nickoneill.github.io/oculus-menu/chart.html). You can capture and print accelerometer data from the rift by looking at where `allAccels` is commented out in the code.

I almost made a feature where data was sent between windows using intercom.js and live-charted. If you wanted to improve the tap detection and needed a better live view of accelerometer data, this might be a good place to start.
