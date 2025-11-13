import Plotly from 'plotly.js-dist-min'
import { Component, Mediator, Button, DropdownSelector } from './components.js' 
import { PlotlyPlot } from './plot.js';
import { seeqPlugin } from './seeqplugin.js';


let seeq;
let PLOT_AREA_ELEM = 'plotarea';
let MEDIATOR;
let iconselect = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Pro v5.15.4 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.--><path d="M505 174.8l-39.6-39.6c-9.4-9.4-24.6-9.4-33.9 0L192 374.7 80.6 263.2c-9.4-9.4-24.6-9.4-33.9 0L7 302.9c-9.4 9.4-9.4 24.6 0 34L175 505c9.4 9.4 24.6 9.4 33.9 0l296-296.2c9.4-9.5 9.4-24.7.1-34zm-324.3 106c6.2 6.3 16.4 6.3 22.6 0l208-208.2c6.2-6.3 6.2-16.4 0-22.6L366.1 4.7c-6.2-6.3-16.4-6.3-22.6 0L192 156.2l-55.4-55.5c-6.2-6.3-16.4-6.3-22.6 0L68.7 146c-6.2 6.3-6.2 16.4 0 22.6l112 112.2z"/></svg>`


document.addEventListener("DOMContentLoaded", function () {
    let plugin = new seeqPlugin();
    MEDIATOR = new Mediator();
    MEDIATOR.register(plugin);
    registerHandlers(plugin);
    let container = document.getElementById("firstcontainer")
    let height = container.clientHeight;
    let plotHeight = height*0.8
    let width = container.clientWidth;
    let plotWidth = width*0.8;
    let plot = new PlotlyPlot(PLOT_AREA_ELEM, {height : plotHeight, width: plotWidth});
    MEDIATOR.register(plot);
    let dimButton = new Button('dimBtn', 'dimBtn', 'toolbar', 'DIM_BTN_CLICK', 'Dimming', iconselect,false);
    MEDIATOR.register(dimButton);
    let boxButton = new Button('boxBtn', 'boxBtn', 'toolbar', 'BOX_BTN_CLICK', 'Boxplot', iconselect, true);
    MEDIATOR.register(boxButton);
    let pointsDropdown = new DropdownSelector('pointsSelector', 'toolbar', 'pointsSelector', 'POINTS_SELECT_CHANGE', [{text: 'None', value:'none', eventValue:false},{text: 'All', value:'all', eventValue:'all'}, {text: 'Outliers', value:'outliers', eventValue:'outliers'}, {text: 'Suspected outliers', value:'suspectedoutliers', eventValue:'suspectedoutliers'}])
    MEDIATOR.register(pointsDropdown);
});

function registerHandlers(plugin) {
    getSeeqApi().then(_seeq => {
        seeq = _seeq;
        plugin.registerSeeq(seeq);
    });
}



