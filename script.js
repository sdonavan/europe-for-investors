/**
* A map component
**/
Vue.component('map-timeline',
{
    props: ['metricsource', 'year', 'metricRelationship'],

    template: '<div style = "width: 100%; height: 600px;"></div>',

    mounted: function()
    {
        this.year = 2016

        Promise
            .all([this.getDataFile(this.metricsource), this.getDataFile('countries.json')])
            .then(r =>
            {
                //Save the metric as to not pass it around all the time
                this.metric = r[0]
                this.drawMap(this.$el, r[1], r[0])
            })
    },

    methods:
    {
        /**
        * Fetches a file and returns a promise with the data
        * @param   {String}   Source          A filename for the JSON file
        * @return  {Promise}                  A promise to fetch the files
        **/
        getDataFile: dataSource => new Promise((res, rej) => d3.json(dataSource, data => res(data))),

        /**
        * Draws a map of all european countries and colors them accordingly given
        * a specific metric
        * @param   {DOMNode}  element         A container element to draw to
        * @param   {Array}    metrics         A metrics array.
        * @param   {Array}    countries       A countries geolocation array
        * @return  {void}
        **/
        drawMap: function(element, countries, metrics)
        {
            var w = this.$el.offsetWidth
            var h = this.$el.offsetHeight

            var projection = d3
                .geoMercator() //utiliser une projection standard pour aplatir les pôles, voir D3 projection plugin
                .center([ 11, 54 ]) //comment centrer la carte, longitude, latitude
                .translate([ w/2, h/2 ]) // centrer l'image obtenue dans le svg
                .scale([ h/1 ]) // zoom, plus la valeur est petit plus le zoom est gros

            //Define path generator
            var path = d3
                .geoPath()
                .projection(projection)


            //Create SVG
            var svg = d3
                .select(this.$el)
                .append("svg")
                .attr("width", w)
                .attr("height", h)

            //Bind data and create one path per GeoJSON feature
            svg
                .selectAll("path")
                .data(countries.features)
                .enter()
                .append("path")
                .attr("d", path)
                .attr("stroke", '#dddddd')
                .attr("fill", this.calculateColor)
                .attr("id", (d, i) => '#path_' + i)

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
        calculateMetricForYear(d)
        {
            var countryName = d.properties.admin,
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
            var metric = this.calculateMetricForYear(d)

            if (typeof metric == 'number' && metric >= 1000)
                return (this.calculateMetricForYear(d) / 1000).toFixed(1) + 'K'
            if (typeof metric == 'number')
                return metric

            // Default to N/A
            return 'N/A'
        },

        /**
        * Given a feature input of the form in countries.json, which includes a
        * countru name calculate a representitive color for the value of the
        * metric of the said country in the predefined year.
        * The value is calculated dynamically given the distribution of the metric,
        * with values closer to the distribution Supremum having higher Hue
        * in a HLS color notation.
        * @param   {d}                A feature object as defined in countries.json
        * @return  {String}           A css rgba color string
        **/
        calculateColor: function(d)
        {
            // Try to find the metric value for the country in the selected year
            valueForCountryForYear = this.calculateMetricForYear(d)

            // If no value exists for the given year, return a default color
            if(!valueForCountryForYear)
                return 'rgb(188, 188, 188)'

            // Get min and max data for the year. Could be run outside of the function,
            // but "premature optimization yada yada.."
            var AllYearlyData = this.metric
                .map(m => m[this.year])
                .filter(m => m !== 'undefined' && m !== '')
                .map(m => (typeof m == 'string') ? m.replace(',', '') : m)
                .map(m => Number(m))
                .filter(m => !isNaN(m))

            var minValue = Math.min.apply(Math, AllYearlyData),
                maxValue = Math.max.apply(Math, AllYearlyData),
                restrictedValue = this.rangeConverter(valueForCountryForYear, minValue, maxValue, 0, 1),
                trueRestrictedValue = (this.metricRelationship !== 'reversed') ? restrictedValue/ 2 : (1 - restrictedValue)/ 2
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
            var r, g, b

            if(s == 0)
                r = g = b = l // achromatic
            else
            {
                var hue2rgb = (p, q, t) =>
                {
                    if(t < 0) t += 1
                    if(t > 1) t -= 1
                    if(t < 1/6) return p + (q - p) * 6 * t
                    if(t < 1/2) return q
                    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6
                    return p
                }

                var q = l < 0.5 ? l * (1 + s) : l + s - l * s
                var p = 2 * l - q
                r = hue2rgb(p, q, h + 1/3)
                g = hue2rgb(p, q, h)
                b = hue2rgb(p, q, h - 1/3)
            }

            return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
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
            var money = this.capital && Number(this.capital) || 1.00

            // Parse the participants
            return this.participants.replace(/ /g,'').split(',').map(participant =>
            {
                var witholdedExp = /\(([^)]+)\)/

                var witholded = witholdedExp.exec(participant) && witholdedExp.exec(participant)[1]

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
var app = new Vue({

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
