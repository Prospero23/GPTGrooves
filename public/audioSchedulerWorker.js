let timerID=null;
let interval=100;

self.onmessage=function(e){
	if (e.data=="start") {
		// console.log("starting");
		timerID=setInterval(function(){postMessage("tick");},interval)
	}
	else if (e.data.interval) {
		// console.log("setting interval");
		interval=e.data.interval;
		// console.log("interval="+interval);
		if (timerID) {
			window.clearInterval(timerID);
			timerID=setInterval(function(){postMessage("tick");},interval)
		}
	}
	if (e.data === 'stop') {
		// console.log('Received stop command. TimerID is:', timerID);
		if (timerID !== null) {
		  clearInterval(timerID);
		 // console.log('Interval cleared.');
		  timerID = null;
		} else {
		 // console.log('No active timer to clear.');
		}
	  }
};

postMessage('hi there');
