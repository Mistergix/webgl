import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GUI} from 'dat.gui';
import { Box3, LoadingManager, Vector3 } from 'three';

export class Viewer {
    constructor(container, fov = 45){
        this.container = container;
        this.gui = null;
        this.model = null;
        this.data = {
            bgColor : "#ffffff",
            wireframe : false
        }

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera( fov, window.innerWidth / window.innerHeight, 0.25, 50 );

        this.scene.add( this.camera );

        this.renderer = window.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.pmremGenerator = new THREE.PMREMGenerator( this.renderer );
		this.pmremGenerator.compileEquirectangularShader();


        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = -10;
        this.controls.screenSpacePanning = true; 

        this.container.appendChild(this.renderer.domElement);


        this.updateBackground();

        this.animate = this.animate.bind(this);
        requestAnimationFrame( this.animate );
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }

    render () {
        this.renderer.render( this.scene, this.camera );
      }

    animate () {
        requestAnimationFrame( this.animate );
        this.controls.update();
        this.render();
    }

    load ( url, rootPath, assetMap ) {

        const baseURL = THREE.LoaderUtils.extractUrlBase(url);
    
        // Load.
        return new Promise((resolve, reject) => {
    
          const manager = new LoadingManager();
    
          // Intercept and override relative URLs.
          manager.setURLModifier((url, path) => {
    
            // URIs in a glTF file may be escaped, or not. Assume that assetMap is
            // from an un-escaped source, and decode all URIs before lookups.
            // See: https://github.com/donmccurdy/three-gltf-viewer/issues/146
            const normalizedURL = rootPath + decodeURI(url)
              .replace(baseURL, '')
              .replace(/^(\.?\/)/, '');
    
            if (assetMap.has(normalizedURL)) {
              const blob = assetMap.get(normalizedURL);
              const blobURL = URL.createObjectURL(blob);
              blobURLs.push(blobURL);
              return blobURL;
            }
    
            return (path || '') + url;
    
          });
    
          const loader = new GLTFLoader( manager )
            .setCrossOrigin('anonymous');
    
          const blobURLs = [];
    
          loader.load(url, (gltf) => {
    
            const scene = gltf.scene || gltf.scenes[0];
            const clips = gltf.animations || [];
    
            if (!scene) {
              // Valid, but not supported by this viewer.
              throw new Error(
                'This model contains no scene, and cannot be viewed here. However,'
                + ' it may contain individual 3D resources.'
              );
            }
    
            this.setContents(scene, clips);
    
            blobURLs.forEach(URL.revokeObjectURL);
    
            // See: https://github.com/google/draco/issues/349
            // DRACOLoader.releaseDecoderModule();
    
            resolve(gltf);
    
          }, undefined, reject);
    
        });
    
      }

    /**
     * @param {THREE.Object3D} model
     */
    setContents(model){
        this.clear();
        const box = new Box3().setFromObject(model);
        const size = box.getSize(new Vector3()).length;
        const center = box.getCenter(new Vector3());

        this.controls.reset();

        model.position.x += (model.position.x - center.x);
        model.position.y += (model.position.y - center.y);
        model.position.z += (model.position.z - center.z);

        this.controls.maxDistance = size * 10;
        this.camera.near = size / 100;
        this.camera.far = size * 100;
        this.camera.updateProjectionMatrix();

        this.camera.position.copy(center);
        this.camera.position.x += size / 2.0;
        this.camera.position.y += size / 5.0;
        this.camera.position.z += size / 2.0;
        this.camera.lookAt(center);

        this.controls.saveState();

        this.scene.add(model);
        this.model = model;

        this.updateDisplay();

        window.content = this.model;
    }

    onWindowResize() {

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.render();
    }

    clear () {

        if ( !this.content ) return;
    
        this.scene.remove( this.content );
    
        // dispose geometry
        this.content.traverse((node) => {
    
          if ( !node.isMesh ) return;
    
          node.geometry.dispose();
    
        } );
    
        // dispose textures
        traverseMaterials( this.content, (material) => {
    
          MAP_NAMES.forEach( (map) => {
    
            if (material[ map ]) material[ map ].dispose();
    
          } );
    
        } );
    
      }

    updateDisplay() {
        if(! this.model) {return;}
        traverseMaterials(this.model, (material) => {
            material.wireframe = this.data.wireframe;
          });
    }

    updateBackground () {
        document.body.style.backgroundColor = this.data.bgColor;
        this.renderer.setClearColor(this.data.bgColor);
      }
};

