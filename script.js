


let DataProvider =
{
    methods:
    {
        getData: function(dataSource, year, relationship, cb)
        {
            this.getDataFile(dataSource, data =>
            {
                let countries =
                    data
                        .map(c => this.calculateMetricForYear(c, year))
                        .filter(c => this.isInEurope(c.name))

                countries.forEach(c => c['color'] = this.calculateColor(c, countries, relationship))

                cb(countries)
            })
        },

        isInEurope: function(c)
        {
            countriesInEurope = ['Albania', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina',
            'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic','Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
            'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'FYR Macedonia',
            'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands', 'Norway', 'Poland', 'Portugal', 'Romania',
            'San Marino', 'Serbia', 'Slovak Republic', 'Slovenia', 'Spain',
            'Sweden', 'Switzerland', 'Ukraine', 'United Kingdom', 'Vatican']

            return countriesInEurope.indexOf(c) >= 0
        },

        /**
        * Fetches a file and calls the callback. Duh.
        * @param   {String}   dataSource          A filename for the JSON file
        * @param   {Function} cb                  The callback function
        * @return  {Promise}                      A promise to fetch the files
        **/
        getDataFile: (dataSource, cb) => d3.json(dataSource, cb),

        /**
        * Given a feature object calculate the metric value for the
        * given year
        * @param   {Object} country    in gdp_ppp_per_capita.json
        * @param   {Number} year      The year we are interested in
        * @return  {Object}           A number representing the metric value
        **/
        calculateMetricForYear(country, year)
        {
            let name = country['Country']
            let metric = (country[year] === undefined || country[year] ==='n/a') ? undefined : Number(String(country[year]).replace(',', ''))
            return {name, metric}
        },

        calculateColor(country, allCountries, relationship)
        {

            // Return default color
            if (country['metric'] === undefined)
                return 'rgb(180, 180, 180)'

            // Get an array of all the defined metrics
            let metrics =
                allCountries
                .map(c => c['metric'])
                .filter(m => typeof m == 'number')

            // Calculate the color
            let minValue = Math.min.apply(Math, metrics),
                maxValue = Math.max.apply(Math, metrics),
                restrictedValue = this.rangeConverter(country['metric'], minValue, maxValue, 0, 1),
                trueRestrictedValue = (relationship !== 'reversed') ? restrictedValue/ 2 : (1 - restrictedValue)/ 2
                rgb = this.hslToRgb(trueRestrictedValue, 0.5, 0.5)

            return 'rgb(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ')'
        },

        /**
        * Convert a number in a range to a number in a different range,
        * for example 3 in the range 1 - 10 will be converted to 30 in the range
        * 1 - 100
        * @param   {number}  oldValue The input value
        * @param   {number}  oldMin   The lower bound of the input range
        * @param   {number}  oldMax   The upper bound of the input range
        * @param   {number}  newMin   The lower bound of the output range
        * @param   {number}  newMax   The upper bound of the output range
        * @return  {number}           The new calculcated number
        **/
        rangeConverter: (oldValue, oldMin, oldMax, newMin, newMax) => (oldValue - oldMin) / (oldMax - oldMin) * (newMax - newMin) + newMin,

        /**
        * Converts an HSL color value to RGB. Conversion formula
        * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
        * Assumes h, s, and l are contained in the set [0, 1] and
        * returns r, g, and b in the set [0, 255].
        *
        * @param   {number}  h       The hue
        * @param   {number}  s       The saturation
        * @param   {number}  l       The lightness
        * @return  {Array}           The RGB representation
        */
        hslToRgb: function(h, s, l)
        {
            let r, g, b

            if(s == 0)
                r = g = b = l // achromatic
            else
            {
                let hue2rgb = (p, q, t) =>
                {
                    if(t < 0) t += 1
                    if(t > 1) t -= 1
                    if(t < 1/6) return p + (q - p) * 6 * t
                    if(t < 1/2) return q
                    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6
                    return p
                }

                let q = l < 0.5 ? l * (1 + s) : l + s - l * s
                let p = 2 * l - q
                r = hue2rgb(p, q, h + 1/3)
                g = hue2rgb(p, q, h)
                b = hue2rgb(p, q, h - 1/3)
            }

            return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
        }
    }
}


Vue.component('bar-chart',
{
    template: '<div class = "bar-chart"></div>',

    mixins: [DataProvider],

    props: ['metricsource', 'year', 'metricRelationship'],

    mounted: function()
    {
        let year = this.year|| 2000

        this.getData(this.metricsource, year, this.metricRelationship, data => this.drawChart(this.$el, data))
    },

    methods:
    {
        drawChart: function(element, data)
        {
            let w = element.offsetWidth
            let h = element.offsetHeight

            let canvas = d3
                .select(element)

            // Sort the data bt the metric
            var data = data.sort((a, b) => a.metric <= b.metric)

            canvas
                .selectAll("div")
                .data(data)
                .enter()
                .append("div")
                .attr("class", "bar")

            canvas
                .selectAll(".bar")
                .append("div")
                .attr("class", "identifier")
                .append("img")
                .attr("src", c => 'icons/' + c.name.toLowerCase() + '.png')

            canvas
                .selectAll(".bar")
                .selectAll(".identifier")
                .append("label")
                .html(c => c.name)

            let max = Math.max.apply(Math, data.map(d => d.metric))

            canvas
                .selectAll(".bar")
                .append("div")
                .attr("class", "value")
                .html(c => c.metric)
                .style("width", "0%")
                .transition()
                .duration(1000)
                .style("width", c => this.rangeConverter(c.metric, 0, max, 0, 40) + 10 + '%')
                .style("background-color", c => c.color)
                //.html(c => c.metric)
        }
    }
})

/**
* A map component
**/
Vue.component('map-chart',
{
    props: ['metricsource', 'year', 'metricRelationship'],

    template: '<div class = "map-chart"></div>',

    mixins: [DataProvider],

    mounted: function()
    {
        let year = this.year|| 2000

        this.getDataFile('countries.json', countries =>
        {
            this.getData(this.metricsource, year, this.metricRelationship, data =>
            {
                this.drawMap(this.$el, countries, data)
            })
        })
    },

    methods:
    {
        /**
        * Draws a map of all european countries and colors them accordingly given
        * a specific metric
        * @param   {DOMNode}  element         A container element to draw to
        * @param   {Array}    metrics         A metrics array.
        * @param   {Array}    countries       A countries geolocation array
        * @return  {void}
        **/
        drawMap: function(element, geoData, countries)
        {
            let w = element.offsetWidth
            let h = element.offsetHeight

            let projection = d3
                .geoMercator() //utiliser une projection standard pour aplatir les pôles, voir D3 projection plugin
                .center([ 6, 48 ]) //comment centrer la carte, longitude, latitude
                .translate([ w/2, h/2 ]) // centrer l'image obtenue dans le svg
                .scale([ w/1.2 ]) // zoom, plus la valeur est petit plus le zoom est gros

            //Define path generator
            let path = d3
                .geoPath()
                .projection(projection)


            //Create SVG
            let svg = d3
                .select(element)
                .append("svg")
                .attr("width", w)
                .attr("height", h)

            //Bind data and create one path per GeoJSON feature
            svg
                .selectAll("path")
                .data(geoData.features)
                .enter()
                .append("path")
                .attr("d", path)
                .attr("stroke", '#dddddd')
                .attr("fill", d =>
                {
                    let country = countries.find(c => c['name'].contains(d.properties.name) || c['name'].contains(d.properties.formal_en))
                    return country && country['color'] || 'white'
                })
                .attr("id", (d, i) => '#path_' + i)

            return
            svg
                .selectAll('rect')
                .data(countries.features)
                .enter()
                .filter(this.calculateMetricForYear)
                .append("rect")
                .attr('fill', this.calculateColor)
                .attr("x", d => path.centroid(d)[0] - 3.5)
                .attr('y', d => path.centroid(d)[1] - 10)
                .attr('width', '30px')
                .attr('height', '14px')

            // Draw the labels
            svg
                .selectAll("text")
                .data(countries.features)
                .enter()
                .filter(this.calculateMetricForYear)
                .append("text")
                .text(this.calculateLabel)
                .attr("x", d => path.centroid(d)[0])
                .attr('y', d => path.centroid(d)[1])
                .attr('title', d => d.properties.admin)
        },

        /**
        * Given a feature object calculate the metric value for the
        * given year
        * @param   {d}                A feature object as defined in countries.json
        * @return  {number}           A number representing the metric value
        **/
        calculateMetricForYearddd(d)
        {
            let countryName = d.properties.admin,
                country     = this.metric.find(m => m.Country == countryName),
                thisYear = country && country[this.year]
                valueForCountryForYear = (typeof thisYear === 'string') ? Number(thisYear.replace(',', '')) : thisYear

            if (typeof valueForCountryForYear == 'number')
                return valueForCountryForYear
            else
                return undefined
        },

        /**
        * Given a feature input of the form in countries.json, which includes a
        * countru name calculates a decent label
        * @param   {d}                A feature object as defined in countries.json
        * @return  {String}           The label for the specific metric
        **/
        calculateLabel: function(d)
        {
            let metric = this.calculateMetricForYear(d)

            if (typeof metric == 'number' && metric >= 1000)
                return (this.calculateMetricForYear(d) / 1000).toFixed(1) + 'K'
            if (typeof metric == 'number')
                return metric

            // Default to N/A
            return 'N/A'
        }
    }
})


/**
* A chain of companies /countries etc. witholding taxes
*/
Vue.component('witholding-chain',
{
    props: ['participants', 'capital'],

    template: `
                <div class ="witholding-chain">
                    <div v-for = "p in parsedParticipants">

                        <div class = "witholder">

                            <div class ="icon-group">
                                <img v-for = "i in p.icons" v-bind:src = "'icons/' + i + '.png'">
                            </div>

                            <span class ="witholded" v-if = "p.witholded !== null">{{Math.round(p.witholded * 100) / 100}}€</span>
                        </div>

                        <span v-if ="p != parsedParticipants[parsedParticipants.length - 1]">---{{Math.round(p.money * 100) / 100}}€---></span>
                    </div>
                </div>`,

    computed:
    {
        /**
        * Converts a string of the type: "icon1:icon2:icon3(amount), icon1(amount) ..."
        * into an apropriate Array of objects of the type {icons[icon1, icon2], money: MONEY witholded: WITHOLDED}
        *
        * @return  {Array}                   Array of objects of the type {icons[icon1, icon2], money: MONEY witholded: WITHOLDED}
        * @return  {Array}:Object:MONEY      The total money the individual participant in the chain has. The default start is 1
        * @return  {Array}:Object:WITHOLDED  The amount of the money witholded. The rest of the money is passed down the chain.
        */
        parsedParticipants: function ()
        {
            // If the start capital is not defined, set it to 1
            let money = this.capital && Number(this.capital) || 1.00

            // Parse the participants
            return this.participants.replace(/ /g,'').split(',').map(participant =>
            {
                let witholdedExp = /\(([^)]+)\)/

                let witholded = witholdedExp.exec(participant) && witholdedExp.exec(participant)[1]

                // Calculate the witholded sum
                if (Number(witholded))
                    witholded = Number(witholded)
                if (witholded == 'all')
                    witholded = money

                money -= witholded
                return {icons: participant.replace(witholdedExp, '').split(':'), witholded, money}
            })
        }
    }
})


/**
* The app is going to serve the purpouse of a router
**/
let app = new Vue({

    el: '#content',

    data:
    {
        page:   'valuations',
        valuation: 'GDP PPP Per Capita'
    },

    created: function()
    {
        // Set the correct page
        this.page = window.location.hash.replace('#', '')
    },

    watch:
    {
        page: function(newPage)
        {
            // Save the current page
            window.location.hash = newPage
        },

        valuation: function(newValuation)
        {
            this.test()
            console.log(newValuation)
        }
    },

    methods:
    {
        test: function()
        {
        console.log("AAA")
        }
    }
})
