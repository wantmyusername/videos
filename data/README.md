# Flight data

`airports.json` and `routes.json` were generated from the OpenFlights open data:

- Source: https://openflights.org/data.html
- Routes: https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat
- Airports: https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat
- Airlines: https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat
- License: Open Database License (ODbL) 1.0
- License URL: https://opendatacommons.org/licenses/odbl/1-0/
- Attribution: OpenFlights.org

The data contains direct route pairs with valid IATA airports, active airlines, and a minimum great-circle distance of 100 km. Flight numbers are not part of OpenFlights; the API generates a synthetic number and marks it with `syntheticFlightNumber: true`.
