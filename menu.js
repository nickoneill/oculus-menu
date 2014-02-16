var renderer, camera;
var scene, element;
var ambient, point;
var aspectRatio, windowHalf;
var mouse, time;

var clock;

var useRift = false;
var stopRender = false;
var riftCam;

var boxes = [];
var core = [];
var menuTree = {};
var activeMenu = [];
var dataPackets = [];
var horizAccels = [];
var vertAccels = [];
var accelX = 0;
var allAccels = [];

var ground, groundGeometry, groundMaterial;
var defaultMaterial = new THREE.MeshLambertMaterial({ emissive:0x1b7ccc, color: 0x1b7ccc });
var selectedMaterial = new THREE.MeshLambertMaterial({ emissive:0x40ed54, color: 0x40ed54 });

var downMaterial = new THREE.MeshLambertMaterial({ emissive:0xff0000, color: 0xff0000 });
var upMaterial = new THREE.MeshLambertMaterial({ emissive:0xffff00, color: 0xffff00 });

// perfectly level seems low on the rift - maybe because init?
var upwardAngleTweak = 0.1;

// how hard you have to tap
var tapAccelMultiplier = 5;
var tapDisableTicks = 0;
var tapDisableLength = 10;

var pointerCircle;
var fauxMenuArea;

var bodyAngle;
var bodyAxis;
var bodyPosition;
var viewAngle;

var velocity;
var oculusBridge;

// Map for key states
var keys = [];
for(var i = 0; i < 130; i++){
  keys.push(false);
}

function printAccels(){
  var accels = "";
  for (var i = 0; i < allAccels.length; i++) {
    accels += allAccels[i]+",";
  }

  console.log(accels);
}

function initScene() {
  clock = new THREE.Clock();
  mouse = new THREE.Vector2(0, 0);

  windowHalf = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
  aspectRatio = window.innerWidth / window.innerHeight;
  
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, aspectRatio, 1, 10000);

  camera.position.set(bodyPosition.x, bodyPosition.y, bodyPosition.z);
  camera.lookAt(scene.position);

  // Initialize the renderer
  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setClearColor(0x161616);
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene.fog = new THREE.Fog(0xdbf7ff, 300, 700);

  element = document.getElementById('viewport');
  element.appendChild(renderer.domElement);
}


function initLights(){

  ambient = new THREE.AmbientLight(0x222222);
  scene.add(ambient);

  point = new THREE.DirectionalLight( 0xffffff, 1, 0, Math.PI, 1 );
  point.position.set( -250, 250, 150 );
  
  scene.add(point);
}

function initGeometry(){

  var floorMaterial = new THREE.MeshBasicMaterial( { color:0x515151, wireframe:true, transparent:true, opacity:0.5 } );
  var floorGeometry = new THREE.PlaneGeometry(200, 200, 10, 10);
  var floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;

  scene.add(floor);

  // pointer
  var pointerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
  pointerCircle = new THREE.Mesh( new THREE.CircleGeometry(1), pointerMaterial );
  pointerCircle.position.set(0, 0, -100);
  scene.add(pointerCircle);

  var menuMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 });
  fauxMenuArea = new THREE.Mesh( new THREE.PlaneGeometry(120, 120), menuMaterial );
  fauxMenuArea.position.set(0, 0, -100);
  scene.add(fauxMenuArea);

  // primary menu
  var meshObjects = [];
  for (var i = 0; i < 3; i++) {
    var pri = new THREE.Mesh( new THREE.PlaneGeometry(100, 15), defaultMaterial );
    pri.position.set(0, 25-(17*i), -100);
    meshObjects.push(pri);
    scene.add(pri);
  };

  menuTree = {meshes: meshObjects, submenus: []};
  activeMenu = menuTree;
}

function selectMenuItem(index){
  var leftVector = new THREE.Vector3(-10, 0, 0);

  // old menus get pushed and destroyed
  for (var i = 0; i < activeMenu.meshes.length; i++){
    dataPackets.push({
      type:  "menuOut",
      obj:   activeMenu.meshes[i],
      speed: leftVector
    });
  }

  var selectedMenu;;
  if (activeMenu.submenus.length) {
    // menu exists, reuse
    selectedMenu = activeMenu.submenus[index];

  } else {
    // make all submenus and store them

    for (var i = 0; i < activeMenu.meshes.length; i++) {

      var meshObjects = [];
      for (var j = 0; j < Math.ceil(Math.random() * 3); j++) {
        var pri = new THREE.Mesh( new THREE.PlaneGeometry(100, 15), defaultMaterial );
        pri.position.set(200, 25-(17*j), -100);
        meshObjects.push(pri);
      };

      var newMenu = {meshes: meshObjects, submenus: []};

      activeMenu.submenus.push(newMenu);
    }

    selectedMenu = activeMenu.submenus[index];
  }
  
  for (var i = 0; i < selectedMenu.meshes.length; i++){
    scene.add(selectedMenu.meshes[i]);

    dataPackets.push({
      type:  "menuIn",
      obj:   selectedMenu.meshes[i],
      speed: leftVector
    });
  }

  activeMenu = selectedMenu;
}

function menuMoveUp(){
  var rightVector = new THREE.Vector3(14, 0, 0);

  var parent = findParentFor(menuTree, activeMenu);
  console.log("parent "+parent);

  if (parent) {
    for (var i = 0; i < activeMenu.meshes.length; i++){
      dataPackets.push({
        type:  "menuOut",
        obj:   activeMenu.meshes[i],
        speed: rightVector
      });
    }

    for (var i = 0; i < parent.meshes.length; i++){
      scene.add(parent.meshes[i]);

      dataPackets.push({
        type:  "menuBack",
        obj:   parent.meshes[i],
        speed: rightVector
      });
    }

    activeMenu = parent;
  }
}

function findParentFor(parent, menumatch){
  for (var i = 0; i < parent.submenus.length; i++) {
    if (parent.submenus[i] == menumatch) {
      return parent;
    }
  }

  var foundParent;
  for (var i = 0; i < parent.submenus.length; i++) {
    foundParent = findParentFor(parent.submenus[i], menumatch);

    if (foundParent) {
      return foundParent;
    }
  }

}

// ############

function bridgeConnected(){
  document.getElementById("logo").className = "";
}

function bridgeDisconnected(){
  document.getElementById("logo").className = "offline";
}

function bridgeConfigUpdated(config){
  console.log("Oculus config updated.");
  riftCam.setHMD(config);
}

function bridgeOrientationUpdated(quatValues) {
  // TODO: Don't instantiate new objects in here, these should be re-used to avoid garbage collection.

  // make a quaternion for the the body angle rotated about the Y axis.
  var quat = new THREE.Quaternion();
  quat.setFromAxisAngle(bodyAxis, bodyAngle);

  // make a quaternion for the current orientation of the Rift
  var quatCam = new THREE.Quaternion(quatValues.x, quatValues.y, quatValues.z, quatValues.w);

  // multiply the body rotation by the Rift rotation.
  quat.multiply(quatCam);

  // Make a vector pointing along the Z axis and rotate it accoring to the combined look/body angle.
  var xzVector = new THREE.Vector3(0, upwardAngleTweak, -1);
  xzVector.applyQuaternion(quat);

  // Compute the X/Z angle based on the combined look/body angle.  This will be used for FPS style movement controls
  // so you can steer with a combination of the keyboard and by moving your head.
  viewAngle = Math.atan2(xzVector.z, xzVector.x) + Math.PI;

  // Apply the combined look/body angle to the camera.
  camera.quaternion.copy(quat);

  // determine if we intersect a menu
  var raycast = new THREE.Raycaster( camera.position, xzVector );
  var intersect = raycast.intersectObjects( activeMenu.meshes );

  for (var i = 0; i < activeMenu.meshes.length; i++) {
    activeMenu.meshes[i].material = defaultMaterial;
  }

  if (intersect.length) {
    // console.log("intersect: "+intersect[0].object.position.y);
    intersect[0].object.material = selectedMaterial;
  };

  // control the pointer
  var intersect = raycast.intersectObject( fauxMenuArea );
  if (intersect.length) {

    pointerCircle.position.set(intersect[0].point.x, intersect[0].point.y, -100);
    pointerCircle.visible = true;
  } else {
    pointerCircle.visible = false;
  }
}

function bridgeAccelerationUpdated(accelValues) {
  if (tapDisableTicks > 0) {
    tapDisableTicks--;
  }

  // for debugging
  // allAccels.push("{x:"+Date.now()+",y:"+accelValues.x+"}");

  // apparently a highpass filter could improve this over simple moving averages
  var horizTotal = 0;
  for (var i = 0; i < horizAccels.length; i++) {
    horizTotal += horizAccels[i];
  };
  var avgHoriz = horizTotal / horizAccels.length;
  var selectItem = Math.abs(accelValues.x) >= avgHoriz*tapAccelMultiplier;

  var vertTotal = 0;
  for (var i = 0; i < vertAccels.length; i++) {
    vertTotal += vertAccels[i];
  };
  var avgVert = vertTotal / vertAccels.length;
  // console.log("vert "+Math.abs(accelValues.y-9.8)+" "+avgVert*7);
  var goUp = Math.abs(accelValues.y-9.8) >= avgVert*7;

  var menuUp, selected = false;
  if (goUp && tapDisableTicks === 0) {
    tapDisableTicks = tapDisableLength;
    console.log("menu up");
    menuUp = true;
  }

  if (selectItem && tapDisableTicks === 0) {
    tapDisableTicks = tapDisableLength;
    console.log("selected item");
    selected = true;
  }

  if (selected) {
    // // get current look vector
    var xzVector = new THREE.Vector3(0, upwardAngleTweak, -1);
    xzVector.applyQuaternion(camera.quaternion);

    var raycast = new THREE.Raycaster(camera.position, xzVector);
    var intersect = raycast.intersectObjects( activeMenu.meshes );

    if (intersect.length) {
      if (intersect[0].object.position.y > 20) {
        selectMenuItem(0);
      } else if (intersect[0].object.position.y < 0) {
        selectMenuItem(2);
      } else {
        selectMenuItem(1);
      }
    }

  } else if (menuUp) {
    menuMoveUp();
  }

  // move queues along
  if (horizAccels.length > 10) {
    horizAccels.shift();
  }
  if (vertAccels.length > 10) {
    vertAccels.shift();
  }

  horizAccels.push(Math.abs(accelValues.x));
  vertAccels.push(Math.abs(accelValues.y-9.8));
}

// #############

function onMouseMove(event) {
  mouse.set( (event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * 2);
}


function onMouseDown(event) {
  // Stub
  console.log("update.");
}


function onKeyDown(event) {

  if(event.keyCode == 48){ // zero key.
    useRift = !useRift;
    onResize();
  }

  if(event.keyCode == 83){ // s key.
    stopRender = true;
    oculusBridge.disconnect();
  }

  // // prevent repeat keystrokes.
  // if(!keys[32] && (event.keyCode == 32)){ // Spacebar to jump
  //   velocity.y += 1.9;
  // }

  keys[event.keyCode] = true;
}


function onKeyUp(event) {
  keys[event.keyCode] = false;
}


function updateInput(delta) {
  
  var step        = 25 * delta;

}

// ###############

function onResize() {
  if(!useRift){
    windowHalf = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
    aspectRatio = window.innerWidth / window.innerHeight;

    camera.aspect = aspectRatio;
    camera.updateProjectionMatrix();
   
    renderer.setSize(window.innerWidth, window.innerHeight);
  } else {
    riftCam.setSize(window.innerWidth, window.innerHeight);
  }
}

function animate() {
  var delta = clock.getDelta();
  time += delta;
  
  updateInput(delta);
  for(var i = 0; i < core.length; i++){
    core[i].rotation.x += delta * 0.25;
    core[i].rotation.y -= delta * 0.33;
    core[i].rotation.z += delta * 0.1278;
  }

  var bounds = 200;
  for(var i = 0; i < dataPackets.length; i++){
    dataPackets[i].obj.position.add(dataPackets[i].speed);

    if (dataPackets[i].type == "menuOut") {
      if (dataPackets[i].obj.position.x < -bounds || dataPackets[i].obj.position.x > bounds){
        scene.remove(dataPackets[i].obj);
        dataPackets.splice(i, 1);
        break;
      }
    }

    if (dataPackets[i].type == "menuIn") {
      if (dataPackets[i].obj.position.x <= 0) {
        dataPackets.splice(i, 1);
        break;
      }
    }

    if (dataPackets[i].type == "menuBack") {
      if (dataPackets[i].obj.position.x >= 0) {
        dataPackets.splice(i, 1);
        break;
      }
    }

    // if(dataPackets[i].obj.position.x < -bounds) {
    //   dataPackets[i].obj.position.x = bounds;
    // } else if(dataPackets[i].obj.position.x > bounds){
    //   dataPackets[i].obj.position.x = -bounds;
    // }
    // if(dataPackets[i].obj.position.z < -bounds) {
    //   dataPackets[i].obj.position.z = bounds;
    // } else if(dataPackets[i].obj.position.z > bounds){
    //   dataPackets[i].obj.position.z = -bounds;
    // }
  }

  
  if(render() && !stopRender){
    requestAnimationFrame(animate);  
  }
}

function render() { 
  try{
    if(useRift){
      riftCam.render(scene, camera);
    }else{
      renderer.render(scene, camera);
    }  
  } catch(e){
    console.log(e);
    if(e.name == "SecurityError"){
      crashSecurity(e);
    } else {
      crashOther(e);
    }
    return false;
  }
  return true;
}


function crashSecurity(e){
  oculusBridge.disconnect();
  document.getElementById("viewport").style.display = "none";
  document.getElementById("security_error").style.display = "block";
}

function crashOther(e){
  oculusBridge.disconnect();
  document.getElementById("viewport").style.display = "none";
  document.getElementById("generic_error").style.display = "block";
  document.getElementById("exception_message").innerHTML = e.message;
}

function init(){

  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);
  document.addEventListener('mousedown', onMouseDown, false);
  document.addEventListener('mousemove', onMouseMove, false);

  window.addEventListener('resize', onResize, false);

  time          = Date.now();
  bodyAngle     = 0;
  bodyAxis      = new THREE.Vector3(0, 1, 0);
  bodyPosition  = new THREE.Vector3(0, 15, 0);
  velocity      = new THREE.Vector3();

  initScene();
  initGeometry();
  initLights();
  
  oculusBridge = new OculusBridge({
    "debug" : true,
    "onOrientationUpdate" : bridgeOrientationUpdated,
    "onAccelerationUpdate": bridgeAccelerationUpdated,
    "onConfigUpdate"      : bridgeConfigUpdated,
    "onConnect"           : bridgeConnected,
    "onDisconnect"        : bridgeDisconnected
  });
  oculusBridge.connect();

  riftCam = new THREE.OculusRiftEffect(renderer);
}

window.onload = function() {
  init();
  animate();
}