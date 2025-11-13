import { Component } from "./components";
import Plotly from 'plotly.js-dist-min';

/** Violin Plot Class @extends Component 
 * @property {string} plotElemId - id of html element containing the plot
 * @property {number} plotWidth - width of plot, default 600px
 * @property {number} plotHeight - heigth of plot, default 400px
 * @property {map} signalMap - map of signals with the signal id as key and trace index as value
 * @property {map} signalPropertiesMap - map of signal id's with signal properties. 
 * @property {boolean} dimmingEnabled - enable / disable dimming functionality
 * @property {boolean} showBoxplot - show / hide boxplot on violintraces
 * @property {string | boolean} pointsDisplayType - points display type (false | all | outliers | suspectedoutliers)
*/
class PlotlyPlot extends Component {
    componentType = 'plotlyPlot'
    plotElemId;
    plotWidth = 600;
    plotHeight = 400;
    signalMap = new Map();
    signalPropertiesMap = new Map();
    dimmingEnabled = false;
    showBoxplot = true;
    pointsDisplayType = false;

    /**
     * Constructor for plot
     * @param {string} plotElemId - id of html element containing the plot
     * @param {object} params @prop {number} [params.width=600] @prop {number} [params.height=400]
     */
    constructor(plotElemId, params = {}) {
        super();
        this.plotElemId = plotElemId;
        this.plotWidth = params?.width ?? 600;
        this.plotHeight = params?.height ?? 400;
        this.initPlotlyPlot()
    }

    /**Initializes new plotly plot */
    initPlotlyPlot() {
        let data = [];
        let layout = {
            showlegend: false,
            width: this.plotWidth,
            height: this.plotHeight,
            autosize: true
        };
        Plotly.newPlot(this.plotElemId, data, layout, { scrollZoom: true, responsive: true, modeBarButtonsToRemove: ['toImage', 'select2d', 'lasso2d'], displaylogo: false });
    }

    listen(e) {
        switch (e.type) {
            case 'SIGNAL_DATA_UPDATE':
                if (this.signalMap.has(e.value?.signal?.id)) {
                    this.updateTraceData(e.value);
                } else {
                    let id = e.value?.signal?.id
                    this.signalMap.set(id, 1);
                    this.addTrace(e.value)
                }
                break;
            case 'SYNC_SIGNALS':
                this.syncSignals(e.value)
                break;
            case 'DIM_BTN_CLICK':
                this.dimmingEnabled = e.value;
                if (!(this.dimmingEnabled)) {
                    this.makeAllVisible()
                } else {
                    this.enableDimming()
                }
                break;
            case 'BOX_BTN_CLICK':
                this.showBoxplot = e.value;
                this.toggleBoxPlot();
                break;
            case 'POINTS_SELECT_CHANGE':
                this.pointsDisplayType = e.value;
                this.updatePointsDisplayType();
        }
    }
    /**
     * updates signals on plot
     * @param {object[]} signals 
     */
    syncSignals(signals) {
        let active = signals.map(s => s.id);
        this.signalMap.forEach((t, k) => {
            if (!(active.includes(k))) {
                Plotly.deleteTraces(this.plotElemId, [t]).then((p) => {
                    this.signalMap.delete(k)
                    let idIndex = p.data.map((trace, index) => [trace.meta[0], index])
                    idIndex.forEach(p => { this.signalMap.set(...p) })
                })
            }
        })
        this.signalPropertiesMap.forEach((t, k) => {
            if (!(active.includes(k))) {
                this.signalPropertiesMap.delete(k)
            }
        })
        let updateColors = [];
        let updateVisibility = [];
        signals.forEach(signal => {
            if (this.signalPropertiesMap.has(signal.id)) {
                if (signal.color !== this.signalPropertiesMap.get(signal.id).color) {
                    updateColors.push([signal.color, this.signalMap.get(signal.id)])
                }
                if (signal.selected !== this.signalPropertiesMap.get(signal.id).selected) {
                    updateVisibility.push([signal.selected, this.signalMap.get(signal.id)])
                } 
            }
            this.signalPropertiesMap.set(signal.id, signal);
        })

        if (updateColors.length > 0) {
            this.updateTraceColors(updateColors);
        }
        if (updateVisibility.length > 0 && this.dimmingEnabled) {
            this.updateTraceVisibility(updateVisibility);
        }
    }
    /**Updates trace colors @param {array[string[]]} updateList - update info : [[color, traceindex], [color, traceindex], ..] */
    updateTraceColors(updateList) {
        //[[color, traceindex], [color, traceindex], ..]
        let colors = updateList.map(x => x[0]);
        let indices = updateList.map(x => x[1]);
        let update = {
            fillcolor : colors
        }
        Plotly.restyle(this.plotElemId, update, indices);
    }
    /**
     * updates traces visibility
     * @param {array[]} updateList - update info: [[visibility, traceindex]]
     */
    updateTraceVisibility(updateList) {
        //[[VISIBility, traceindex],  ..]
        let visibility = updateList.map(x => x[0]);
        let indices = updateList.map(x => x[1]);
        let update = {
            visible : visibility
        }
        Plotly.restyle(this.plotElemId, update, indices);
    }

    /**Updates traces data 
     * @param {*} signalupdate 
     */
    updateTraceData(signalupdate) {
        let datapoints = signalupdate.results.data.samples.samples.map(s => s.value)
        let update = {
            y : [datapoints]
        }
        let index = this.signalMap.get(signalupdate.signal.id);
        Plotly.restyle(this.plotElemId, update, [index])
    }

    /** Makes all traces visible */
    makeAllVisible() {
        const plot = document.getElementById(this.plotElemId);
        const traces = plot.data;
        const indices = traces.map((trace,index) => index)
        let visibility = indices.map(x => true)
        let update = {
            visible: visibility
        }
        Plotly.restyle(this.plotElemId, update, indices)
    }

    /** show / hide boxplots */
    toggleBoxPlot() {
        const plot = document.getElementById(this.plotElemId);
        const traces = plot.data;
        const indices = traces.map((trace,index) => index)
        let state = this.showBoxplot
        let visibility = indices.map(x => state)
        let update = {
            box: {
                visible : state
            }
        }
        Plotly.restyle(this.plotElemId, update, indices)
    }
    /** updates points display type */
    updatePointsDisplayType(){
        const plot = document.getElementById(this.plotElemId);
        const traces = plot.data;
        const indices = traces.map((trace,index) => index)
        let pointsDisplayTypeUpdate = indices.map(x => this.pointsDisplayType)
        let update = {
            points: pointsDisplayTypeUpdate
        }
        Plotly.restyle(this.plotElemId, update, indices)
    }
    /** enable / disable dimming */
    enableDimming() {
        let plot = document.getElementById(this.plotElemId);
        let idIndex = plot.data.map((trace, index) => [trace.meta[0], index])
        let visibility = idIndex.map(i=> this.signalPropertiesMap.get(i[0]).selected)
        let indices = idIndex.map(i => i[1])
        let update = {
            visible: visibility
        }
        Plotly.restyle(this.plotElemId, update, indices)
    }

    /** adds trace @param {*} signalupdate  */
    addTrace(signalupdate) {
        let datapoints = signalupdate.results.data.samples.samples.map(s => s.value)
        let name = signalupdate.signal.name
        let color = signalupdate.signal.color ?? '#8dd3c7'
        let visible = !(this.dimmingEnabled) || (this.dimmingEnabled && signalupdate.signal.selected)
        let trace = {
            type: 'violin',
            y : datapoints,
            points: this.pointsDisplayType,
            box: {
                visible: this.showBoxplot
            },
            boxpoints: false,
            line: {
                color: 'black'
            },
            fillcolor: color,
            opacity: 0.6,
            meanline: {
                visible: true
            },
            x0: name, 
            meta: [signalupdate.signal.id] 
        }
        Plotly.addTraces(this.plotElemId, [trace]).then(p => {
            let idIndex = p.data.map((trace, index) => [trace.meta[0], index])
            idIndex.forEach(p => {this.signalMap.set(...p)})
            
        })

    }
    /** deletes all traces from plot */
    clearPlot() {
        const plot = document.getElementById(this.plotElemId);
        const traces = plot.data;
        const indices = traces.map((trace,index) => index)
        Plotly.deleteTraces(this.plotElemId, indices);
    }
}

export { PlotlyPlot }