# Tesis

# English

## Neurosky TGSP communication protocol
The ThinkGear Socket Protocol (TGSP) is a JSON-based protocol for the transmission and receipt of ThinkGear brainwave data between a client and a server. TGSP was designed to allow languages and/or frameworks without a standard serial port API to easy integrate breanwave sensing functionality thrugh socket APIs.

This specific software was adapted for node.js by De Jesus Guillermo and Luis Luna owners of this proyect.

For More detail visit: 
http://developer.neurosky.com/docs/doku.php?id=thinkgear_socket_protocol


## Neurosky communication REST API
Little API with node + express + morgan to get headset data in real time

##Requirements
- ThinkGearConnector. Download from http://developer.neurosky.com/docs/doku.php?id=thinkgear_connector_tgc
- Node.js. Download from https://nodejs.org/en/

## API Usage
1. Run ThinkGearConnector application
2. Run server via: 
	- Open a terminal or windows command line/powershell and move to the application directory
	- Use the command: npm run dev
3. Plug in the EEG Device USB dongle to the computer
4. Put on the EEG Device and turn it on. Wait until both the USB dongle and the EEG Device light indicators turn from red to blue, this should indicate that the EEG device is connected.
5. Wait a moment and EEG Server should be reading brainwaves.

## API Methods

- /all: Returns all the samples red during the current session or an especific sample count via the size parameter. E. g.: localhost:xxxx/all?size=5
- /single: Returns the latest read sample from EEG Device. E. g.: localhost:xxxx/single
- /getDirection: Returns a direction prediction based on the latest EEG reading. E. g.: localhost:xxxx/getDirection
	- Directions are an integer numbers from 0 to 4 and represent one of the following:
		- 0: No direction
		- 1: Down
		- 2: Up
		- 3: Left
		- 4: Right

# Español

## Protocolo de comunicaciones Neurosky TGSP communication protocol
El Protocolo ThinkGear Socket (TGSP) es un protocolo baso en JSON para la transmision y recepcion datos de ondas cerebrales ThinkGear entre cliente y servidor. 
El protocolo TGSP fue diseñado para permitir a lenguajes y/o frameworks sin una API para puerto serie, integrar de manera sencilla funcionalidades de lectura de ondas cerebrales a través de APIs de sockets.

Este software especifico fue adaptado para node.js por De Jesus, Guillermo y Luis Luna, desarrolladores de este proyecto.

Para más detalle visitar:
http://developer.neurosky.com/docs/doku.php?id=thinkgear_socket_protocol


## Api REST de comunicaciones Neurosky 
Pequeña API 
Little API compuesta de node, express y morgan, para lectura de datos de casco EEG para obtener datos en tiempo real.

## Requerimientos
- ThinkGearConnector. Descargar desde http://developer.neurosky.com/docs/doku.php?id=thinkgear_connector_tgc
- Node.js. Descargar desde https://nodejs.org/en/

## Uso de API
1. Ejecutar la aplicacion ThinkGearConnector de NeuroSky
2. Iniciar el servidor de la siguiente manera: Open a terminal or windows command line/powershell, move to the application directory and use the command: npm run dev
	- Abrir una termina o consola de comandos o powershell de windows, y moverse al directorio donde se encuentra servidor
	- Usar el comando: npm run dev
3. Conectar el dongle USB del casco EEG a la computadora
4. Colocarse el casco EEG y encenderlo. 
	- Espere hasta que tanto en el dongle USB como el casco EEG se encienda una luz, que pasa de rojo a azul, esto indicará que el dispositivo se ha conectado correctamente.
5. Esperar un momento y la API EEG debería comenzar a leer ondas cerebrales.


## Métodos de la API

- /all: Devuelve todas las muestras leídas durante la sesión actual o una cantidad especifica mediante el parametro size. Ej.: localhost:xxxx/all?size=5
- /single: Devuelve la lectura más reciente del casco EEG. Ej.: localhost:xxxx/single
- /getDirection: Devuelve una predicción de dirección basada en la lectura EEG más reciente. Ej.: localhost:xxxx/getDirection
	- Las direcciones son números enteros que van desde 0 a 4, y representan una de las siguientes:
		0. Ninguna dirección
		1. Abajo
		2. Arriba
		3. Izquierda
		4. Derecha
