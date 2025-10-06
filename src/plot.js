import { Component } from "./components";
import Plotly from 'plotly.js-dist-min';

class PlotlyPlot extends Component {
    componentType = 'plotlyPlot'
    plotElemId;
    plotWidth = 600;
    plotHeight = 400;
    signalMap = new Map();
    constructor(plotElemId, params = {}) {
        super();
        this.plotElemId = plotElemId;
        this.plotWidth = params?.width ?? 600;
        this.plotHeight = params?.height ?? 400;
        this.initPlotlyPlot()
    }

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
                let active = e.value.map(s => s.id);
                this.signalMap.forEach((t, k) => {
                    if (!(active.includes(k))) {
                        Plotly.deleteTraces(this.plotElemId, [t]).then(() => { this.signalMap.delete(k)})
                    }
                })
        }
    }

    updateTraceData(signalupdate) {
        let datapoints = signalupdate.results.data.samples.samples.map(s => s.value)
        let update = {
            y : [datapoints]
        }
        let index = this.signalMap.get(signalupdate.signal.id);
        Plotly.restyle(this.plotElemId, update, [index])
    }

    addTrace(signalupdate) {
        let datapoints = signalupdate.results.data.samples.samples.map(s => s.value)
        let name = signalupdate.signal.name
        let color = signalupdate.signal.color ?? '#8dd3c7'
        let trace = {
            type: 'violin',
            y : datapoints,
            points: 'none',
            box: {
                visible: true
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

    clearPlot() {
        const plot = document.getElementById(this.plotElemId);
        const traces = plot.data;
        const indices = traces.map((trace,index) => index)
        Plotly.deleteTraces(this.plotElemId, indices);
    }
}

export { PlotlyPlot }