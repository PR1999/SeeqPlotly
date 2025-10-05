
import Plotly from 'plotly.js-dist-min'


let seeq;
let PLOT_AREA_ELEM = 'plotarea'
let debugmode = true;

function devlog(data) {
    if (debugmode) {
        console.log(data)
    }
}

document.addEventListener("DOMContentLoaded", function() {
    let plugin = new seeqPlugin();
    registerHandlers(plugin);
    setQuotes(); //TODO remove
    initPlotlyPlot(PLOT_AREA_ELEM);

});

function registerHandlers(plugin) {
    getSeeqApi().then(_seeq => {
        seeq = _seeq;
        plugin.registerSeeq(seeq);
    });
}


class seeqPlugin {
    initPromises = [];
    pluginInfo;
    seeq;
    workbook;
    worksheet;
    displayrange;

    constructor() {

    }
    syncSignals(signals) {
        devlog('syncSignals');
        devlog(signals);
        signals.forEach(s => {
            this.seeq.setTrendDataStatusLoading(s.id);
            this.loadSignal(s)
        });
    }

    async loadSignal(signal) {
        if (this.displayrange===undefined) {
            return
        }
        let startDate = new Date(this.displayrange.start)
        startDate = startDate.toISOString();
        let endDate = new Date(this.displayrange.end)
        endDate = endDate.toISOString();
        let p = {
                start : startDate,
                end : endDate,
                formula : '$series',
                parameters : {series : signal.id},
                cancellationGroup : `cg${signal.id}`
        }
        try {
            let results = await this.seeq.runFormula(p)
            devlog(results)
            return results

        } catch (error) {
            this.seeq.catchItemDataFailure(signal.id, `cg${signal.id}`, error )
        }

    }

    syncConditions(conditions) {
        devlog('syncConditions');
        devlog(conditions);
    }

    syncDisplayRange(newdisplayrange) {
        devlog(newdisplayrange);
        this.displayrange = newdisplayrange;
    }

    registerSeeq() {
        devlog('Registering Plugin SEEQ API');
        this.seeq = seeq;
        this.registerInfo();
        this.registerToPlugin();
    }

    registerInfo() {
        devlog('Registering Plugin info');
        this.pluginInfo = seeq.pluginInfo;
        this.worksheet = seeq.worksheet;
        this.workbook = seeq.workbook;
    }

    registerToPlugin() {
        devlog('Registering Plugin Handlers ');
        this.seeq.subscribeToSignals(this.init(signals => this.syncSignals(signals)));
        this.seeq.subscribeToConditions(this.init(conditions => this.syncConditions(conditions)));
        this.seeq.subscribeToDisplayRange(this.init(displayrange => this.syncDisplayRange(displayrange)));
    }

    init(func) {
        let resolve;
        this.initPromises.push(new Promise(r => { resolve = r; }));
        return (...args) => {
            func(...args);
            resolve();
        };
    }
}

function initPlotlyPlot(elementId) {
    let data = [];
    let layout = {
        showlegend: false,
        width: 600,
        height: 400,
        autosize: true
    };
    Plotly.newPlot(elementId, data, layout, { scrollZoom: true, responsive: true, modeBarButtonsToRemove: ['toImage', 'select2d', 'lasso2d'], displaylogo: false });
}

function QOTD() {

    let QOTD = [
        'Before you ask more questions, think about whether you really want to know the answers.',
        'Do not believe in miracles -- rely on them.',
        'For fast acting relief, try slowing down.',
        'Nothing is as simple as it seems at first, or as hopeless as it seems in the middle, or as finished as it seems in the end.',
        'Ninety percent of everything is crap.',
        'The chief cause of problems is solutions.',
        'There are two reasons for doing anything; a good reason, and the real reason.',
        "Be incomprehensible. If they can't understand, they can't disagree.",
        'If you want divine justice, die.',
        'If you find a solution and become attached to it, the solution may become your next problem.',
        'It is not doing the thing we like to do, but liking the thing we have to do, that makes life blessed.',
        "Seeing is believing. You wouldn't have seen it if you hadn't believed it.",
        'All I ask of life is a constant and exaggerated sense of my own importance. ',
        "Apathy Club meeting this friday. If you want to come, you're not invited.",
        'Chairman of the Bored',
        'I\'d rather just believe that its done by little eleves running around..',
        'When you dont know what you are doing, do it neatly.',
        'Ignorance is when you dont know anything and somebody finds out.',
        'Do not try to solve all life\'s problems at once --- learn to dread each day as it comes.',
        'Do not believe everything you hear or anything you say.',
        'The average nutritional value of promises is roughly zero.'
    ];

    let i = Math.floor(Math.random()* QOTD.length)
    let quote = QOTD[i]
    return quote
}

function setQuotes() {
    let list = document.getElementById('notices')
    list.innerHTML = `<li>${QOTD()}</li><li>${QOTD()}</li><li>${QOTD()}</li>`
}
