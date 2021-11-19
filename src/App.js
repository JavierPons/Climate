import React, { useEffect, useState } from 'react';
import Metolib from '@fmidev/metolib';
import { Map, Marker, TileLayer } from "react-leaflet";
import styled from "styled-components";
import L from "leaflet";
import Sidebar from './Sidebar';
import './App.css';
import rainy from './images/rainy-day.png';

const MapContainer = styled(Map)`
    width: calc(100vw - 300px);
    height: 100vh;
    position:absolute;
    top:0px;
    left:300px;
`;


// Ugly hack to fix Leaflet icons with leaflet loaders
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});


function App() {
  const [observationLocations, setObservationLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [airTemperature, setAirTemperature] = useState([]);
  const [cityName, setCityName] = useState('Helsinki');

  useEffect(
    function fetchObservationLocations() {
    const connection = new Metolib.WfsConnection();
    console.log('connection ',connection);
    if (connection.connect('http://opendata.fmi.fi/wfs', 'fmi::observations::weather::cities::multipointcoverage')) {
      connection.getData({
        begin: Date.now() - 60 * 24 * 60 * 1000,
        end: Date.now(),
        requestParameter: "t,snowdepth,r_1h",
        timestep: 60 * 60 * 1000,
        bbox: "20.6455928891, 59.846373196, 31.5160921567, 70.1641930203",
        callback: (data, errors) => {
          if (errors.length > 0) {

            errors.forEach(err => {
              console.error('FMI API error: ' + err.errorText);
            });
            return;
          }
         setAirTemperature(data.locations);

          setObservationLocations(data.locations
            .map(loc => {
              const [lat, lon] = loc.info.position.map(parseFloat);
              return {...loc, position: {lat, lon}}
            })
          );

          connection.disconnect();
        }
      });
    }
  }, []);

  const handleSelect = (e) => {
      setCityName(e.target.value);  
  }

  const position = [65, 26];
  const map = (
    <MapContainer center={position} zoom={6}>
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains='abcd'
        maxZoom={19}
      />
      {observationLocations.map((loc, indx) => 
      <Marker position={[loc.position.lat, loc.position.lon]}
        key={indx} onClick={() => setSelectedLocation(loc.info.id)}>
      </Marker>
      )
      }
    </MapContainer>
  );

  return (
    <div>
        <select
        id="select" 
        value={cityName}
        onChange={handleSelect}
        >
            <option value="Helsinki">Helsinki</option>
            <option value="Espoo">Espoo</option>
            <option value="Vantaa">Vantaa</option> 
        </select>
        
        <div className='box'>
            {airTemperature.map((temp, indx) => {
                let dateString;
                if(temp.info.region === cityName) {
                    if(temp.data.t.timeValuePairs[24].value === isNaN) {
                        dateString = JSON.stringify(new Date(temp.data.t.timeValuePairs[24].time + 7200000));
                        return;
                    } else {
                        dateString = JSON.stringify(new Date(temp.data.t.timeValuePairs[23].time + 7200000)); 
                          
                    }
                    dateString = dateString.slice(1,-1);
                    dateString = dateString.slice(0, 16);
                    return ( 
                        <div key={indx}>
                        <h4>{dateString}</h4>  
                        {/* timeValuePairs value on array place 24 and 25 show sometimes NaN I try to deal with that here. Need a bit implementation 
                        Anyway at this moment show what I wanted array index 23 */}
                        <h4>{cityName} {temp.data.t.timeValuePairs[24].value !== isNaN ? temp.data.t.timeValuePairs[23].value : temp.data.t.timeValuePairs[23].value} °C
                        {temp.data.r_1h.timeValuePairs[23].value > 0 ? <div>It's rainy <img src={rainy} id="rainy" alt="rainy" /></div>: <p>It is dry</p>}</h4>
                        </div>
                    )}
            })} 
            {console.log('selectedLocation ', selectedLocation)}
        </div>
        {/* <Sidebar selectedLocationId={selectedLocation} observationLocations={observationLocations}/> */}
        {map}
    </div>
  );
}

export default App;