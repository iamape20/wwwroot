import { loadDashboard } from "./pages/dashboard.js";

function updateClock(){

    const now = new Date();

    document.getElementById("clock").textContent =
        now.toLocaleTimeString([],{
            hour:"2-digit",
            minute:"2-digit"
        });

}

updateClock();

setInterval(updateClock,1000);

loadDashboard();