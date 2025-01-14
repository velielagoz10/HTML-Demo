let mousePos= {x:0, y:0};
    HEIGHT = window.innerHeight,
    WIDTH = window.innerWidth,
    flag=true;

const   Pi = Math.PI,    
        scene = new THREE.Scene(),
        camera = new THREE.PerspectiveCamera(60, WIDTH/HEIGHT, 1, 10000),
        renderer = new THREE.WebGLRenderer({alpha: true, antialias: true}),
        container = document.getElementById('ocean'),  
        ambientLight = new THREE.AmbientLight(0x045c7c, .5),
        hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x000000, .9),
        shadowLight = new THREE.DirectionalLight(0xffffff, .9);

const shapes = { //all the variables behind the objects in the scene
    seabed : {
        radius: 660,
        height: 700,
        rSeg:50,
        hSeg:20,
        ampR: 20,
        speedC: .015,
        color: 0x531e1e,
        rotation: .005,
        x: 0,
        y: -620,
        z: -50,
        step: .000005, 
    },
    bottle : {
        colors : ["orange", "blue","white", "red", "green", "blue",],
        height: 20,
        radius: 5,
        segments: 16,
        x: 0,
        y: 150,
        z: 110,
        scale: 1,
    },
    can : {
        colors : ["green", "orange", "black", "red", "brown", "blue",],
        radius:5,
        height: 20,
        segments: 16,
    },
    fish : {
        radius : 4,
        height : 15,
        segments : 12,

    },
    water : {
        groupNumber : 22,
        membersNumber : 20,
        depth: 450,
        step: .0015,
    },
    tire : {
        innerR : 8,
        outerR : 16,
        rSegments : 8,
        tSegments : 20,
        number: 25,
        step: .003,
    },
    tentacle : {
        partsNum: 20,
        partsOffset: 30,
        firstOff: 10,
    },
    jellyfish : {
        y : 100,
        z : 110,
        minX: -350,
        maxX: 350,
        minY: 70,
        maxY: 450,
    }
};
const settings={
    camera: {
        x:0,
        y:350,
        z:600,
        xRot: -Pi/32,
    },
    oNpause: false,
},
    params = {
        jsize:1,
        speed:1,
        tsize:1,
};

let water,
    trash, 
    trashHolder, 
    jellyfish, 
    tentacles = [],
    jellyDisplacementX = 0, 
    jellyDisplacementY = 0, 
    crashSpeedX = 0, 
    crashSpeedY = 0,
    crash,
    countTentacles=0;

function initScene() { //scene initialisation
    scene.fog = new THREE.Fog(0x38bbb7, -200,950);
    camera.position.set(settings.camera.x,settings.camera.y,settings.camera.z);
    camera.rotation.x=settings.camera.xRot;
    renderer.setSize(WIDTH, HEIGHT);
	renderer.shadowMap.enabled = true;
	container.appendChild(renderer.domElement);
	window.addEventListener('resize', handleWindowResize, false);
}

function normalize(v,vmin,vmax,tmin, tmax){
	const nv = Math.max(Math.min(v,vmax), vmin);
	const dv = vmax-vmin;
	const pc = (nv-vmin)/dv;
	const dt = tmax-tmin;
	const tv = tmin + (pc*dt);
	return tv;
}

function handleMouseMove(event) {
    const tx = -1 + (event.clientX / WIDTH)*2;
    const ty = 1 - (event.clientY / HEIGHT)*2;
    mousePos = {x:tx, y:ty};
}

function handleWindowResize() {
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	renderer.setSize(WIDTH, HEIGHT);
	camera.aspect = WIDTH / HEIGHT;
	camera.updateProjectionMatrix();
}

function initLights() {
    scene.add(hemisphereLight);
    scene.add(shadowLight);
    scene.add(ambientLight);
}

Seabed = function(rad,h,rS,hS,a,sC,color,xP,yP,zP){
    //the seabed is rotated cylinder
    const geometry = new THREE.CylinderGeometry(rad,rad,h,rS,hS);
    geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Pi/2));
    geometry.mergeVertices();
    const length = geometry.vertices.length;
    this.bumps = [];
    //add some bumps for more realism
    for(let i=0; i<length; i++){
        const v = geometry.vertices[i];

        this.bumps.push({x : v.x,
                         y : v.y,
                         z : v.z, 
                         ang: Math.random()*Pi*2,
                         amp: Math.random()*a,
                         speed: sC + Math.random()*sC});
    }

    const material = new THREE.MeshPhongMaterial({ 
        color: color,
        transparent:true,
        opacity:.99,
        flatShading:true,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true;
    this.mesh.position.set(xP,yP,zP);
}

Seabed.prototype.moveBumps = function (step){
	const verts = this.mesh.geometry.vertices;
	const length = verts.length;
	
	for (let i=0; i<length; i++){
		const v = verts[i];
		const vprops = this.bumps[i];
		v.x = vprops.x + Math.cos(vprops.ang)*vprops.amp;
		v.y = vprops.y + Math.sin(vprops.ang)*vprops.amp;
        vprops.ang += vprops.speed;
	}

	this.mesh.geometry.verticesNeedUpdate=true;
	seabed.mesh.rotation.z += step;
}

const seabed = new Seabed(shapes.seabed.radius, shapes.seabed.height,
                          shapes.seabed.rSeg, shapes.seabed.hSeg,
                          shapes.seabed.ampR, shapes.seabed.speedC, shapes.seabed.color,
                          shapes.seabed.x, shapes.seabed.y, shapes.seabed.z);
scene.add(seabed.mesh);

Water = function(gN,mN,d){
    // water collects all of the different thing that can be swimming in it
    this.mesh = new THREE.Object3D();
    this.objects = [];
    const step = Pi*2 / gN;
    let angle , object , type,offset,depth;
    for(let j = 0; j < gN; j++){
        angle = step*j;
        offset = (Pi/16)*(Math.random()*0.4 + 0.8); // put the next object on random place

        for(let i = 0; i  < mN; i++){
            
            type = Math.floor(Math.random()*30); //choose the type of the object, it can be bottle, can or fish
            if(type<8) {
                offset = (Pi/4)*(Math.random()*0.4 - 0.8);
                if(type<3) object = new Bottle(shapes.bottle.radius, shapes.bottle.height, shapes.bottle.segments,shapes.bottle.scale,shapes.bottle.colors);
                else object = new Can(shapes.can.radius, shapes.can.height,shapes.can.segments, shapes.can.colors);

                object.mesh.rotation.z= Math.random()*Pi*2;
            }
            else {
                offset = (Pi/8)*(Math.random()*0.4 - 0.8);
                object = new Fish(shapes.fish.radius,shapes.fish.height,shapes.fish.segments);
                object.mesh.rotation.z = angle + offset;
            }
            object.mesh.position.z = 0-Math.random()*d;
            this.objects.push(object);
            depth = shapes.seabed.height + Math.random()*d*1.5;
            object.mesh.position.y = Math.sin(angle + offset)*(depth);
            object.mesh.position.x = Math.cos(angle + offset)*(depth);
            object.angle = angle + offset;
            this.mesh.add(object.mesh);
        }      
    }
}


function createWater(y){
      water = new Water(shapes.water.groupNumber, shapes.water.membersNumber,shapes.water.depth);
      water.mesh.position.y = shapes.seabed.y;
      scene.add(water.mesh);
}

Fish = function(r,h,seg){
    //the fish is created with three cones
    this.mesh = new THREE.Object3D();
    this.mesh.name = "fish";
 
    const geomHead =  new THREE.ConeGeometry( r, h*8/15, seg);
    const material = new THREE.MeshPhongMaterial({ color:new THREE.Color("rgb(255,"+ Math.floor(95 + Math.random()*100) +","+ (Math.floor(Math.random()*20))+")"),});
    const head = new THREE.Mesh(geomHead, material);
    head.castShadow = true;
    head.receiveShadow = true;
    this.mesh.add(head);
    
    const geomBody = new THREE.ConeGeometry(r, h, seg);
    const body = new THREE.Mesh(geomBody,material);
    body.rotation.x= Pi;
    body.position.y-=h*.77;
    body.castShadow= true;
    body.receiveShadow = true;
    this.mesh.add(body);

    const geomTail = new THREE.ConeGeometry(r/2, h*7/15, seg/3);
    const tail = new THREE.Mesh(geomTail,material);
    tail.position.y-=h*4/3;
    tail.castShadow = true;
    tail.receiveShadow = true;
    this.mesh.add(tail);
}


const Bottle = function(r,h,seg,sc,colors){
    //the bottle is created with cylinders
    //material simulates transparency 
    this.mesh= new THREE.Object3D();
    const type = Math.floor(Math.random()*3 );
    const materialLiquid = new THREE.MeshPhongMaterial({color: colors[2*(type)], transparent: true, opacity: .6, flatShading:true,});
    const materialLabel = new THREE.MeshPhongMaterial({color: colors[2*(type) + 1], transparent: true,opacity: .7 , flatShading:true,});
    const geometryBody = new THREE.CylinderGeometry(r,r,h,seg,seg);
    const body = new THREE.Mesh(geometryBody, materialLiquid);
    this.mesh.add(body);

    const geometryLabel = new THREE.CylinderGeometry(r,r,h*.4,seg,seg,0, Pi/4);
    const label = new THREE.Mesh(geometryLabel, materialLabel);
    label.position.y+=h/10;
    this.mesh.add(label);

    const geometryNeck = new THREE.CylinderGeometry(r/3, r, h*.6, seg, seg);
    const neck = new THREE.Mesh(geometryNeck, materialLiquid);
    neck.position.y+=h*.8;
    this.mesh.add(neck);
        
    const geometryCap = new THREE.CylinderGeometry(r*.4, r*.4, 3*h/20,seg,seg);
    const cap = new THREE.Mesh(geometryCap, materialLabel);
    cap.position.y+=h*1.2;
    this.mesh.add(cap);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.scale.set(sc,sc,sc);
}

const Can = function(r,h,seg,colors){
// using the same approach as for the bottle
    this.mesh= new THREE.Object3D();
    const type = Math.floor(Math.random()*3 );
    const materialLiquid = new THREE.MeshPhongMaterial({color: colors[2*(type)], transparent: true, opacity: .6, flatShading:true,});
    const materialLabel = new THREE.MeshPhongMaterial({color: colors[2*(type) + 1], transparent: true, opacity: .7 , flatShading:true,});
    const geometryBody = new THREE.CylinderGeometry(r,r,h,seg,seg);
    const body = new THREE.Mesh(geometryBody, materialLiquid);
    this.mesh.add(body);

    const geometryLabel = new THREE.CylinderGeometry(r,r,h*.7,seg,seg,0, Pi/4);
    const label = new THREE.Mesh(geometryLabel, materialLabel);
    label.position.y+=h/40;
    this.mesh.add(label);

    const geometryCap = new THREE.CylinderGeometry(r*.9, r, h/20, seg, seg);
    const topCap = new THREE.Mesh(geometryCap, materialLiquid);
    topCap.position.y+=h*.525;
    this.mesh.add(topCap);

    const bottomCap = new THREE.Mesh(geometryCap, materialLiquid);
    bottomCap.rotation.x+=Pi;
    bottomCap.position.y-=h*.525;
    this.mesh.add(bottomCap);
        
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  
}

const Tire = function(iR,oR,rS,tS,sc){
    //the tire is createt of two toruses with different radius
    this.mesh = new THREE.Object3D();
    const materialBody = new THREE.MeshPhongMaterial({color: 0x080808, flatShading:true,});
    const geometryBody = new THREE.TorusGeometry( oR, iR, rS, tS );

    const body = new THREE.Mesh(geometryBody,materialBody);
  
    const materialPattern= new THREE.MeshPhongMaterial({color: 0x191414, flatShading:true,})
    const geometryPattern = new THREE.TorusGeometry( oR*1.01, iR, rS, tS, Pi/16);
    geometryPattern.openEnded=true;

    for(let i=0; i<16; i++){
        const pattern = new THREE.Mesh(geometryPattern, materialPattern);
        pattern.rotation.z+=i*Pi/8;
        this.mesh.add(pattern);
    }
    this.displX = 0;
    this.displY = 0;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.scale.set(sc,sc,sc);
    this.mesh.add(body);
}

TrashHolder = function(){
    //this is where all the tires are stored
    this.mesh = new THREE.Object3D();
    this.elements = [];
}

TrashHolder.prototype.spawnTrash = function(d,z,n){
    //putting tires around the seabed
    for(let i=0; i<n; i++){
        const trash = new Tire(shapes.tire.innerR,shapes.tire.outerR,shapes.tire.rSegments,shapes.tire.tSegments,1);
        trash.angle =2*Pi*i/n -  Math.random()*.3;
        trash.angleCopy = trash.angle;
        trash.distance = d + 50 + Math.random()*50;
        trash.offset = Math.random()*350;
        trash.mesh.rotation.y = Math.random()*Pi;
        trash.mesh.rotation.z = Math.random()*Pi;
        trash.mesh.position.z= z;
        trash.mesh.position.y =trash.offset - shapes.seabed.height + Math.sin(trash.angle)*trash.distance;
        trash.mesh.position.x = Math.cos(trash.angle)*trash.distance;
        this.mesh.add(trash.mesh);  
        this.elements.push(trash);
    }
}

TrashHolder.prototype.rotateTrash = function(step,scale){
    //we rotate all of the tires and in the same time we are checking if there is a collision
    //between one of the tires and the jellyfish
    for(let i = 0; i <this.elements.length; i++){
        const singleTrash = this.elements[i];
        singleTrash.angle+=step;
        singleTrash.mesh.position.y= singleTrash.offset - shapes.seabed.height*.95 + Math.sin(singleTrash.angle)*(singleTrash.distance) ;
        singleTrash.mesh.position.x = Math.cos(singleTrash.angle)*(singleTrash.distance);
        singleTrash.mesh.scale.set(scale,scale,scale);
        const diffPos = jellyfish.mesh.position.clone().sub(singleTrash.mesh.position.clone());
        const d = diffPos.length();
        if(d<2*shapes.tire.outerR*params.tsize + params.jsize*4){
            crashSpeedX = 120*diffPos.x / (d);
            crashSpeedY = 120*diffPos.y / (d);
            crash = i;
        }
        if(crash == i && crashSpeedX!=0){
            singleTrash.mesh.position.y= singleTrash.offset - shapes.seabed.height*.95 + Math.sin(singleTrash.angle )*(singleTrash.distance) - jellyDisplacementY/10;
            singleTrash.mesh.position.x= Math.cos(singleTrash.angle)*(singleTrash.distance) - jellyDisplacementX/5 ;
        }
    }
}

TrashHolder.prototype.hide = function(){
    //we're hiding the tires which are outside the camera view
    for(let i = 0; i <this.elements.length; i++){
        if(this.elements[i].mesh.position.y<-50) this.elements[i].mesh.visible = false;
        else  this.elements[i].mesh.visible = true;
    }
}

function createTrash(){
    trashHolder = new TrashHolder();
    trashHolder.spawnTrash(shapes.seabed.height,110,shapes.tire.number);
    scene.add(trashHolder.mesh)
}


const JellyFish = function() {
    //the jellyfish body is created with some dark magic and hand written parameters
    
	this.mesh = new THREE.Object3D();
	
    const points = [];
    points.push(new THREE.Vector2(0, -12));
    points.push(new THREE.Vector2(0.5, -12));
    points.push(new THREE.Vector2(1.5, -11.75));
    points.push(new THREE.Vector2(2.5, -11.5));    
    points.push(new THREE.Vector2(3.5, -11));
    for ( let i = 0; i < 12; i+=2.25 ) points.push( new THREE.Vector2( Math.sin( i * 0.2 ) * 10 + 5, ( i - 5 ) * 2 ) );
	points.push(new THREE.Vector2(0, 11));
    

	const geomBody = new THREE.LatheBufferGeometry( points , 8 ,0, Pi*2);
    const material = new THREE.MeshPhongMaterial({color:0xf7a0a0, flatShading:true, transparent:true, opacity:.8});
    const body = new THREE.Mesh(geomBody, material);
    const geomInside = new THREE.SphereGeometry(10,8,8);
    const materialIn = new THREE.MeshPhongMaterial({color:0xfF90a0, flatShading:true, side:THREE.DoubleSide});
    const inside = new THREE.Mesh(geomInside, materialIn);
    inside.scale.set(.5,.9,1);
    inside.position.x-= 5.25;
    this.mesh.add(inside);
	body.rotation.z = Pi/2;
	body.castShadow = true;
	body.receiveShadow = true;
	this.mesh.add(body);
};


function updateJellyFish(scale,minX,maxX,minY,maxY){
    //with this we make the jellyfish move around the screen
    jellyfish.mesh.rotation.x+=.005;
	let targetX = normalize(mousePos.x, -1, 1, minX, maxX);
    let targetY = normalize(mousePos.y, -1, 1, minY, maxY);
   
    jellyDisplacementX+= crashSpeedX;
    targetX+=jellyDisplacementX;

    jellyDisplacementY+= crashSpeedY;
    targetY+=jellyDisplacementY;

    jellyfish.mesh.position.y+= (targetY - jellyfish.mesh.position.y)*0.02;
    jellyfish.mesh.position.x+= (targetX - jellyfish.mesh.position.x)*0.03;
    jellyfish.mesh.rotation.z = (targetY-jellyfish.mesh.position.y)*0.0050;
	jellyfish.mesh.rotation.x = (jellyfish.mesh.position.x-targetX)*0.0025;

    crashSpeedX+= -1*crashSpeedX*0.07;
    crashSpeedY+= -1*crashSpeedY*0.07;
    jellyDisplacementX+= -1*jellyDisplacementX*0.3;
    jellyDisplacementY+= -1*jellyDisplacementY*0.3;
    
    jellyfish.mesh.scale.set(scale,scale,scale);
    
    for(let i = 0; i < 3; i++) tentacles[i].moveTentacle();
}


function createJellyFish(){
    //the jellyfish is built, now when we have the body and the tentacles
	jellyfish = new JellyFish();
	jellyfish.mesh.scale.set(1.35,1.5,1.5);
	jellyfish.mesh.position.y = shapes.jellyfish.y;
	jellyfish.mesh.position.z = shapes.jellyfish.z;
    scene.add(jellyfish.mesh);
    for(let i=0; i<3; i++) tentacles[i] = new THREE.Object3D;
    createTentacle(0,0);
    createTentacle(-4,-4);
    createTentacle(4,-4);
}

const TentaclePart = function(){
    //the tentacles are made of multiple little spheres
    const geometry = new THREE.SphereGeometry( 2, 6, 6);
    const material = new THREE.MeshPhongMaterial({color: 0xfF90a0, flatShading:true, opacity:.65, transparent:true});
    this.xpos=0;
    this.ypos=0;
    this.oldxpos=0;
    this.oldypos=0;
    this.mesh= new THREE.Mesh(geometry,material);

}

TentaclePart.prototype.movePart = function(){
    this.oldxpos=this.mesh.position.x;
    this.oldypos=this.mesh.position.y;
    this.mesh.position.x=this.xpos;
    this.mesh.position.y=this.ypos;

}

const Tentacle = function(n,o,f){
    this.n=n;
    this.offset = o;
    this.firstOff = f;
    this.mesh = new THREE.Object3D();
    this.parts = [];
    for (let i = 0; i < n; i ++) {
        const part = new TentaclePart();
        part.mesh.position.x = -i*o;
        part.xpos=i;
        part.ypos=part.mesh.position.y;
        this.mesh.add(part.mesh);
        this.parts.push(part);
    }
}
Tentacle.prototype.moveTentacle = function (){
    //when we move the jellyfish each tentacle follow it
    //each tentacle part is following the last state of the part infront of it
    const targetX = jellyfish.mesh.position.x;
    const targetY = jellyfish.mesh.position.y;
    const t = this.parts[0];
    t.xpos = targetX-this.firstOff;
    t.ypos = targetY ;
    t.movePart();
    for(let i=1; i<this.n; i++){
        const a = this.parts[i-1];
        const b = this.parts[i];
        b.xpos = a.oldxpos-(i+1)*.3;
        b.ypos = a.oldypos;
        b.movePart();
    }
}

function createTentacle(y,z){
    tentacles[countTentacles] = new Tentacle(shapes.tentacle.partsNum,shapes.tentacle.partsOffset,shapes.tentacle.firstOff);
    tentacles[countTentacles].mesh.position.z = shapes.jellyfish.z;
    tentacles[countTentacles].mesh.position.z+=z;
    tentacles[countTentacles].mesh.position.y+=y;
    scene.add(tentacles[countTentacles].mesh);
    countTentacles++;
}

function loop(){
    
    if(!settings.oNpause){
        seabed.mesh.rotation.z += shapes.seabed.step*params.speed;
        water.mesh.rotation.z+= shapes.water.step*params.speed;
        seabed.moveBumps(shapes.seabed.rotation);
        trashHolder.rotateTrash(shapes.tire.step*params.speed,params.tsize);
        trashHolder.hide();
        updateJellyFish(params.jsize,
                        shapes.jellyfish.minX,
                        shapes.jellyfish.maxX,
                        shapes.jellyfish.minY,
                        shapes.jellyfish.maxY);
    }
    else{
        changeSliders();
    }
    
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
}

function init(event){
    document.addEventListener('mousemove', handleMouseMove, false);
    initScene();
    initLights();
    createJellyFish();
    createTrash();
    createWater();
    
    loop();
}



window.addEventListener('load', init, false);

document.onkeydown = function(evt) {
    evt = evt || window.event;
    let isEscape = false;
    if ("key" in evt) {
        isEscape = (evt.key == "Escape" || evt.key == "Esc");
    } else {
        isEscape = (evt.keyCode == 27);
    }
    if (isEscape) {
        const x = document.getElementById("overlay");
        if(settings.oNpause){
            x.style.display="none";
        }
        else{
            x.style.display="block";
        }
        settings.oNpause=!settings.oNpause;
    }
};

function changeSliders(){
    const sliderSpeed = document.getElementById("speed").value;
    params.speed=sliderSpeed/160 + 1;
    
    const sliderJSize = document.getElementById("jsize").value;
    params.jsize= sliderJSize/200 + 1;
    
    const sliderTSize = document.getElementById("tsize").value;
    params.tsize= sliderTSize/150 + 1;
};

document.addEventListener('click', function (event) {
    if(!flag){
        clock.start();
        flag=true;
    }
 }, false);

 document.getElementById("button").addEventListener('click', function(){
    settings.oNpause=!settings.oNpause;
    document.getElementById("overlay").style.display="none";
 },false);