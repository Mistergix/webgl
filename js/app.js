import { Viewer } from './viewer.js';
import { SimpleDropzone } from 'simple-dropzone';

class Application{
    constructor(container){
        this.container = container;
        this.viewerContainer = null;
        this.viewer = null;

        this.dropContainer = container.querySelector('.dropzone');
        this.inputContainer = container.querySelector('#file-input');
        this.createDropzone();
    }

    createViewer () {
        this.viewerContainer = document.createElement('div');
        this.viewerContainer.classList.add('viewer');
        document.body.appendChild( this.viewerContainer );
        this.viewer = new Viewer(this.viewerContainer);
        return this.viewer;
      }

      createDropzone () {
        const dropCtrl = new SimpleDropzone(this.dropContainer, this.inputContainer);
        dropCtrl.on('drop', ({files}) => this.load(files));
        dropCtrl.on('dropstart', () => {});
        dropCtrl.on('droperror', () => {});
      }

      
  load (fileMap) {
    let rootFile;
    let rootPath;
    Array.from(fileMap).forEach(([path, file]) => {
      if (file.name.match(/\.(gltf|glb)$/)) {
        rootFile = file;
        rootPath = path.replace(file.name, '');
      }
    });

    if (!rootFile) {
      this.onError('No .gltf or .glb asset found.');
    }

    this.view(rootFile, rootPath, fileMap);
  }

  view (rootFile, rootPath, fileMap) {

    if (this.viewer) this.viewer.clear();

    const viewer = this.viewer || this.createViewer();

    const fileURL = typeof rootFile === 'string'
      ? rootFile
      : URL.createObjectURL(rootFile);

    const cleanup = () => {
      //this.hideSpinner();
      if (typeof rootFile === 'object') URL.revokeObjectURL(fileURL);
    };

    viewer
      .load(fileURL, rootPath, fileMap)
      .catch((e) => this.onError(e))
      .then((gltf) => {
        cleanup();
      });
  }

      onError (error) {
        let message = (error||{}).message || error.toString();
        window.alert(message);
        console.error(error);
      }
}

document.addEventListener('DOMContentLoaded', () => {

    const app = new Application(document.body);
    window.app = app;
  });
  