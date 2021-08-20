# MyApp

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 7.0.4.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).

# angular-unity

Example Angular and Unity integration using:
* Unity
* Angular 6.1.x

## Installation

    npm install

## Usage

    npm start

Then view the site at:

    http://localhost:4200/


## Creating a compatible Unity project

To communicate between JavaScript and Unity you need a few things:

1) Create a Unity Project with GameObject > Controller.cs:

```
    using System.Collections;
    using System.Collections.Generic;
    using UnityEngine;
    using System.Runtime.InteropServices;

    public class Controller : MonoBehaviour {

        [DllImport("__Internal")]
        private static extern void SendMessageToWeb(string msg);

        public void ReceiveMessageFromWeb(string msg) {
            Debug.Log("Controller.ReceiveMessageFromWeb: " + msg);
        }

        // Use this for initialization
        void Start() {
            SendMessageToWeb("Hello from Unity");
        }

        // Update is called once per frame
        void Update() {

        }
    }
```

2) Add a file to the Unity project at: /Assets/Plugins/WebInterface.jslib containing:

```
    mergeInto(LibraryManager.library, {
    SendMessageToWeb: function (str) {
        window.receiveMessageFromUnity(str);
    },
    });
```

3) Build the project as WebGL so that it creates the files:

- demo.data.unityweb
- demo.json
- demo.wasm.code.unityweb
- demo.wasm.framework.unityweb

4) Copy the generated files to this project folder:

    /src/assets
    
5) Embed your generated files using the reusable Angular component:

    <app-unity appLocation="../assets/demo/demo.json"></app-unity>
    
## Directory structure

    src/                       --> Frontend sources files
    unity-src/                 --> Unity script examples


## Contact

For more information please contact kmturley