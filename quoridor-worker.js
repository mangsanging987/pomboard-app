'use strict';
importScripts('quoridor.js');
onmessage=({data})=>postMessage(QuoridorEngine.chooseAI(data.state,data.level));
