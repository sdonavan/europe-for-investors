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

        this.getDataFile('data/countries.json', countries =>
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

            data = this.combineData(geoData, countries)

            let w = element.offsetWidth
            let h = element.offsetHeight

            let projection = d3
                .geoMercator() //utiliser une projection standard pour aplatir les pôles, voir D3 projection plugin
                .center([ 8, 56 ]) //comment centrer la carte, longitude, latitude
                .translate([ w/2, h/2 ]) // centrer l'image obtenue dans le svg
                .scale([ w/1.2 ]) // zoom, plus la valeur est petit plus le zoom est gros

            //Define path generator
            let path = d3
                .geoPath()
                .projection(projection)


            //Create the SVG
            let svg = d3
                .select(element)
                .append('svg')
                .attr('width', w)
                .attr('height', h)

            let svgCountries = this.drawBorders(svg, path, data)
            let patterns = this.drawPatterns(svgCountries, path)
            let labels  = this.drawLabels(svgCountries, path)

            document
                .querySelector('body')
                .addEventListener('country:focused', e => this.showLabel(e.detail))
            document
                .querySelector('body')
                .addEventListener('country:focused', e => this.showPattern(e.detail, svgCountries))
            document
                .querySelector('body')
                .addEventListener('country:unfocused', e => this.hideLabel(e.detail))
            document
                .querySelector('body')
                .addEventListener('country:unfocused', e => this.hidePattern(e.detail))
        },

        combineData: function(geoData, countries)
        {
            return countries.map(c =>
            {
                let GeoJSON = new Object({properties: {}, geometry: {}, type: 'Feature'})


                Object.keys(c).forEach(k => GeoJSON['properties'][k] = c[k])

                let geometryHolder =
                    geoData
                    .features
                    .find(f => f.properties.formal_en == c['name'] || c['name'].indexOf(f.properties.admin) >= 0 || f.properties.admin.indexOf(c['name']) >= 0)

                if (geometryHolder)
                    GeoJSON['geometry'] = geometryHolder.geometry

                return GeoJSON

            }).filter(c => c.geometry)
        },


        drawBorders: function(svg, path, data)
        {

            //g.append("path").attr("d", "M0,0 l25,25");
            //g.append("path").attr("d", "M25,0 l-25,25")

            svg
                .selectAll('g')
                .data(data)
                .enter()
                .append('g')
                .on('mouseenter', (element, index, collection) => collection[index].dispatchEvent(new CustomEvent('country:focused', {detail: element.properties, bubbles: true})))
                .on('mouseleave', (element, index, collection) => collection[index].dispatchEvent(new CustomEvent('country:unfocused', {detail: element.properties, bubbles: true})))
                .attr('id', (d, i) => 'country_' + d.properties.name)

                .append('path')
                .attr('d', path)
                .attr('stroke', '#dddddd')
                .attr('class', 'country')
                .attr('fill', d => d.properties.color)

            return svg.selectAll('g')
        },

        drawPatterns: function(countries, path)
        {

            countries
                .append('path')
                .attr('d', path)
                .attr('stroke', '#dddddd')
                .attr('class', 'overlay')
                .attr('fill', 'red')
                .attr('opacity', 0)
                .attr('width', 0)
        },

        drawLabels: function(svgCountries, path)
        {
            // Draw the label squares
            svgCountries
                .append('rect')
                .filter(d => d.properties.metric)
                .attr('fill', d => d.properties.color)
                .attr('x', d => path.centroid(d)[0] - 15)
                .attr('y', d => path.centroid(d)[1] - 14)
                .attr('height', '14px')
                .attr('class', 'value-holder')

            // Draw the label contents
            svgCountries
                .append('text')
                .text(data => this.formatNumber(data.properties.metric))
                .attr('x', d => path.centroid(d)[0] - 12 || 0)
                .attr('y', d => path.centroid(d)[1] - 4 || 0)
                .attr('title', d => d.properties.admin)
                .attr('class', 'value')
                .attr('width', 0)
                .attr('opacity', 0)
        },

        hidePattern: function(country)
        {
            d3
                .select('#country_' + country.name)
                .select('.overlay')
                .transition()
                .duration(150)
                .attr('opacity', 0)
        },

        showPattern: function(country, svgCountries)
        {
            svgCountries
                .sort((a, b) => (a.properties.name == country.name) ? 1 : -1)

            let svg = d3.select('#country_' + country.name)

            let t = textures.lines()
                    .thicker()
                    .thicker()
                    .stroke("white")
                    .background(country.color)

            svg
                .call(t)
                .select('.overlay')
                .style("fill", t.url())
                .transition()
                .duration(150)
                .attr('opacity', 1)
        },


        showLabel: function(country)
        {
            d3.select('#country_' + country.name)
                .select('text')
                .transition()
                .delay(150)
                .duration(50)
                .attr('opacity', '1')

            d3.select('#country_' + country.name)
                .select('rect')
                .transition()
                .duration(150)
                .attr('width', 30)
        },

        hideLabel: function(country)
        {
            d3.select('#country_' + country.name)
                .select('text')
                .transition()
                .duration(150)
                .attr('opacity', '0')

            d3.select('#country_' + country.name)
                .select('rect')
                .transition()
                .delay(150)
                .duration(150)
                .attr('width', 0)
        }
    }
})
