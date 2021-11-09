var canvas;
var gl;

var numTimesToSubdivide = 3;
 
var index = 0;

var pointsArray = [];
var normalsArray = [];


var near = -10;
var far = 10;
var radius = 1.5;
var theta  = 0.0; // rotation of the camera about the y axis
var phi    = 0.0; // rotation of the camera about the z axis
// var dr = 5.0 * Math.PI/180.0;

var left = -3.0;
var right = 3.0;
var ytop =3.0;
var bottom = -3.0;

// va points straight down
// vb, vc, and vd point up and are spread equally around in a circle
// all vectors are normalized
var va = vec4(0.0, 0.0, -1.0,1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333,1);
    
var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 20.0;

var red = new Uint8Array([255, 0, 0, 255]);
var green = new Uint8Array([0, 255, 0, 255]);
var blue = new Uint8Array([0, 0, 255, 255]);
var cyan = new Uint8Array([0, 255, 255, 255]);
var magenta = new Uint8Array([255, 0, 255, 255]);
var yellow = new Uint8Array([255, 255, 0, 255]);

var cubeMap;

var ambientColor, diffuseColor, specularColor;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var normalMatrix, normalMatrixLoc;

var xeye = 0;
var yeye = 0;
var zeye = 1.5;
var eye = vec3(xeye, yeye, zeye);
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var moving = false;
var movementVector = vec3(0,0,0);
var start = vec3(0,0,0);
var end = vec3(0,0,0);
var sign = 1;

var arc_x = 0;
var arc_y = 0;

function configureCubeMap() {

    cubeMap = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X ,0,gl.RGBA,
       1,1,0,gl.RGBA,gl.UNSIGNED_BYTE, red);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X ,0,gl.RGBA,
       1,1,0,gl.RGBA,gl.UNSIGNED_BYTE, green);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y ,0,gl.RGBA,
       1,1,0,gl.RGBA,gl.UNSIGNED_BYTE, blue);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y ,0,gl.RGBA,
       1,1,0,gl.RGBA,gl.UNSIGNED_BYTE, cyan);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z ,0,gl.RGBA,
       1,1,0,gl.RGBA,gl.UNSIGNED_BYTE, yellow);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z ,0,gl.RGBA,
       1,1,0,gl.RGBA,gl.UNSIGNED_BYTE, magenta);
    

    gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
}


// add the vectors of a triangle to normalsArray    
function triangle(a, b, c) {


     
     pointsArray.push(a);
     pointsArray.push(b);      
     pointsArray.push(c);
    
     // normals are vectors
     
     normalsArray.push(a[0],a[1], a[2]);
     normalsArray.push(b[0],b[1], b[2]);
     normalsArray.push(c[0],c[1], c[2]);

     index += 3;
     
}

// divide a triangle made of vecotors a b and c into count number of triangles
function divideTriangle(a, b, c, count) {
    if ( count > 0 ) {
                
        var ab = mix( a, b, 0.5);
        var ac = mix( a, c, 0.5);
        var bc = mix( b, c, 0.5);
                
        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);
                                
        divideTriangle( a, ab, ac, count - 1 );
        divideTriangle( ab, b, bc, count - 1 );
        divideTriangle( bc, c, ac, count - 1 );
        divideTriangle( ab, bc, ac, count - 1 );
    }
    else { 
        triangle( a, b, c );
    }
}

// create a tetrahedron with enough sides to look like a triangle
function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

window.onload = function init() {

   // Get canvas element
    canvas = document.getElementById( "gl-canvas" );
    
   // Initialize webgl
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    // set viewport to cavas and background colour to white
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //  Shaders are found in index.html
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    

   // light and material interaction
    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);

   // subdivide into many triangles that make up a circle
   // put resulting points into normalsArray
    tetrahedron(va, vb, vc, vd, numTimesToSubdivide);

    // create buffers for sphere = 1,2,3,4,5,6
    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );
    
    // create variable for attribute vNormal
    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal);

    // create buffer for array of points = [1,2,3][4,5,6]
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    // create variable for attribute vPosition
    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    // create variables for Uniforms modelViewMatrix, projectionMatrix, and normalMatrix
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    
    // create texture map
    configureCubeMap();
    gl.activeTexture( gl.TEXTURE0 );
    gl.uniform1i(gl.getUniformLocation(program, "texMap"),0); 

    // set ambientProduct, diffuseProduct, and specularProduct to values determined before
    // set lightPosition, and materialShininess to constants set at the beginning
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );

      // draw everything
    render();

    canvas.onmousedown = function(ev) {
        var mx = ev.clientX, my = ev.clientY;
        mx = mx/canvas.width -0.5;
        my = my/canvas.height -0.5;
        mx = mx*2;
        my = my*-2;
        if((-0.3 <= mx && mx <= 0.3) && (-0.3 <= my && my <= 0.3)){
            moving = true;
            start = vec3(mx, my, radius);
        }
        // Check bacteria from top to bottom (reverse order from how they are displayed on screen)
        // So that the bateria on top will deleted not the one on the bottom
        //radius = ~0.3

    }

    canvas.onmouseup = function(ev) {
        var mx = ev.clientX, my = ev.clientY;
        mx = mx/canvas.width -0.5;
        my = my/canvas.height -0.5;
        mx = mx*2;
        my = my*-2;
        moving = false;
        // console.log(vec3(mx, my, radius));
        start = end;
        // Check bacteria from top to bottom (reverse order from how they are displayed on screen)
        // So that the bateria on top will deleted not the one on the bottom
        //radius = ~0.3

    }

    canvas.onmousemove = function(ev) {
        var mx = ev.clientX, my = ev.clientY;
        mx = mx/canvas.width -0.5;
        my = my/canvas.height -0.5;
        mx = mx*2;
        my = my*-2;
        if((-0.3 <= mx && mx <= 0.3) && (-0.3 <= my && my <= 0.3)){
            if (moving) {
                // console.log('moving');
                old_arc_x = arc_x;
                old_arc_y = arc_y;
                end = vec3(mx, my, radius);
                delta_x = start[0] - end[0];
                delta_y =  start[1] - end[1];
                movementVector = vec3(delta_x, delta_y, radius);
                console.log("delta_x = " + movementVector[0]/12);
                change_x = movementVector[0]/12;
                angle_x = Math.asin((change_x/2) / 1)
                console.log("angle_x = " + angle_x);

                // console.log("delta_y = " + movementVector[1]/12);
                change_y = movementVector[1]/12;
                angle_y = Math.asin((change_y/2) / 1);
                // console.log("angle_y = " + angle_y);

                arc_x = 2*Math.PI*3*(angle_x);
                arc_y = 2*Math.PI*3*(angle_y);
                console.log("arc_x = " + arc_x);
                // console.log("arc_y = " + arc_y);

                arc_x = arc_x + old_arc_x;
                arc_y = arc_y + old_arc_y;

                if (arc_x < -6) {
                    arc_x += 12;
                } else if (arc_x > 6) {
                    arc_x -= 12;
                }
                if (arc_y <= -6) {
                    arc_y += 12;
                } else if (arc_y > 6) {
                    arc_y -= 12;
                }
                console.log("arc_x = " + arc_x);
                xeye = arc_x;
                yeye = arc_y;
                
                eye = vec3(xeye, yeye, zeye);
            } 
        }
        
        // Check bacteria from top to bottom (reverse order from how they are displayed on screen)
        // So that the bateria on top will deleted not the one on the bottom
        //radius = ~0.3

    }
}


function render() {
    // clear the screen
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
   
    // equation of a sphere in x y z coordinates
    //eye = vec3(radius*Math.sin(theta)*Math.cos(phi), 
    // /    radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));
    // eye = vec3(0, yeye, radius);

   // eye is the position of the camera
   // at is the position where the camera is looking at (the origin)
   // up the direction up to the camera (y is our up/down vertex)
    modelViewMatrix = lookAt(eye, at , up);

    // create a matrix with 2/width, 2/hight, -2/distance along the diagonal
    // along the bottom edge is -(left+right)/width etc.
    // 2/w        0           0           0
    // 0          2/h         0           0
    // 0          0           -2/d        0
    // -(l+r)/w   -(t+b)/h     -(f+n)/d   0
    
    // which for us looks like
    // 2/6        0           0           0
    // 0          2/6         0           0
    // 0          0           -2/6        0
    // -(0)/w     -(0)/h      -(0)/d      0
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    
    // normal matrix only really need if there is nonuniform scaling
    // it's here for generality but since there is
    // no scaling in this example we could just use modelView matrix in shaders
    
    normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];
   
    //
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix) );
        

    // index is a count of the points in are array
    // draw each triangle on its own
    for( var i=0; i<index; i+=3) 
        gl.drawArrays( gl.TRIANGLES, i, 3 );

    window.requestAnimFrame(render);
}