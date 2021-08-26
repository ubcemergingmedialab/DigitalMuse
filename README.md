# DigitalMuse
A project where we try to connect people with cameras and microphones in a more interesting way than Zoom.

## First Time Setup
* Download node and npm from here: https://nodejs.org/en/download/
* In folder WebSocketsVideoBroadcast, run the command ``npm install``
* Run the command ``node app.js``
* open browser to localhost:8080
* select Participant or Host to start
* In second browser tab, right click on screen > show controls > press play in bottom left corner


## Building
* put these folders/files into a zip file: .ebextensions/, public/, app.js, package.json
* name the zip file nodejs.zip
* Navigate to AWS ElasticBeanstalk Colocator-env
* Select "Upload and Deploy" and choose the zip file you just created
* once done, your new build should be available at virtualcolocator.ca