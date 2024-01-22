let map;
let resultMarker;
let service;
let infowindow;
let directionsService, directionsRenderer;
var searchbar_results = [];
let portSelectedName;
let placeSelected;
let circle;
const apiKey = 'AIzaSyByTYB1RNrZbrOduZgnVIuwEgS9mAZJl9Q';
const spreadsheetId = '1vVN9l3A2pfCmNVv70q_ormSfkJNtzpi-2qTHXnxnkiY';
const range = 'Sheet1!A:J'; 
let sheetData=[];
let sheetMarkers=[];

let currMarker=[];
let currLocationName;

const { Map } = await google.maps.importLibrary("maps");

const portsData = {
    "Bintulu": { lat:3.2627169, lng: 113.0673422},
    "Kota Kinabalu": {lat:  5.9948161, lng: 116.0809212},
    "Kuching": {lat:  1.5549981, lng: 110.3946074},
    "Labuan": {lat:  5.276603199999999, lng: 115.2422526},
    "Lahad Datu": {lat:  5.0199818, lng: 118.3497611},
    "Miri": {lat:  4.5640731, lng: 114.0401569},
    "Sandakan": {lat:  5.8120943, lng: 118.0774588},
    "Tawau": {lat:  4.244945, lng: 117.879843},
    "Brunei": {lat:  5.029514499999999, lng: 115.0717164},
    "Sibu": {lat:  2.2901369, lng: 111.8227771}
}
let currCenter=portsData["Bintulu"];


async function initMap() {
    infowindow = new google.maps.InfoWindow({
        content:"",
        disableAutoPan: true
    });
    directionsService = new google.maps.DirectionsService({ suppressMarkers: true });
    
    map = new Map(document.getElementById("map"), {
    center: currCenter,
    zoom: 8,
    });

    service = new google.maps.places.PlacesService(map);
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map); 
   
    circle = new google.maps.Circle({
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.05,
        map: map,
        center: currCenter,
        radius: 30000 // 30 km in meters, as an initial value
    });

    refreshCurrentMarker(currCenter, "Bintulu");
    updateSheetMarkers(document.getElementById('radiusSlider').value)

    map.addListener('click', () => {
        infowindow.close();
    });

    const searchButton = document.getElementById('searchButton');
    searchButton.addEventListener('click', function() {
        let query = document.getElementById('searchbar').value;
        searchPlaces(query);
    });

    // Get references to elements
    const searchInput = document.getElementById('searchbar');
    const resultsDropdown = document.getElementById('results');

    // Show the dropdown when the search input is focused
    searchInput.addEventListener('focus', function() {
        resultsDropdown.classList.add('show');
    });

    // Hide the dropdown when focus is lost, but delay the hiding for click events
    searchInput.addEventListener('blur', function(event) {
        // Use setTimeout to allow time for the click to be processed inside the dropdown
        setTimeout(function() {
            resultsDropdown.classList.remove('show');
        }, 200);
    });

    // Hide the dropdown when clicking outside of the search bar or dropdown
    document.addEventListener('click', function(event) {
        const isClickInsideSearchBar = searchInput.contains(event.target);
        const isClickInsideDropdown = resultsDropdown.contains(event.target);
        const isClickInsideSearchButton = searchButton.contains(event.target);

        // If the click is outside both the search bar and dropdown, hide the dropdown
        if (!isClickInsideSearchBar && !isClickInsideDropdown && !isClickInsideSearchButton) {
            resultsDropdown.classList.remove('show');
        }
    });


    // Add event listener for the radius slider adjustment
    const radiusSlider = document.getElementById('radiusSlider');
    radiusSlider.addEventListener('input', function() {
        const radius = Number(this.value);
        document.getElementById("radiusValue").textContent = radius + " km / " + (radius*0.621371).toPrecision(4) + " miles"
        circle.setRadius(radius*1000)
    });

    radiusSlider.addEventListener('mouseup', function() {
        const radius = Number(this.value);
        updateSheetMarkers(radius)

    });
    
    const viewDataButton = document.getElementById('viewDataButton');
    viewDataButton.addEventListener('click', () => {
        const url ="https://docs.google.com/spreadsheets/d/1vVN9l3A2pfCmNVv70q_ormSfkJNtzpi-2qTHXnxnkiY/edit?usp=sharing"
        window.open(url, '_blank');
    });

    document.getElementById('portSelect').addEventListener('change', function() {
        portSelectedName = this.value
        if (searchInput.value != ""){
            updatelocationMetrics();
        }
        
    });

    document.getElementById('newLocationForm').addEventListener('submit', function(event) {
        tokenClient.requestAccessToken();
        if (!this.checkValidity()) {
            event.preventDefault();
            event.stopPropagation();
        }
        this.classList.add('was-validated');
    });
}

function refreshCurrentMarker(coordinates,name) {
    currCenter=coordinates;
    currLocationName=name;
    currMarker.forEach(marker => marker.setMap(null));
    currMarker = [];
    const newMarker = new google.maps.Marker({
        position: location,
        map: map,
        position: coordinates,
    });

    circle.setCenter(coordinates)
    map.setCenter(coordinates)
    currMarker.push(newMarker)
}



function updatelocationMetrics(){
    if (currCenter != null ){
        document.getElementById('locationAddress').textContent = 'Location: ' + currLocationName;
    }

    if (portSelectedName != null){
        document.getElementById('locationPort').textContent = 'Port: ' + portSelectedName;
    }

    if (currCenter != null && portSelectedName != null){
        directionsService.route({
        origin: portsData[portSelectedName],
        destination: currCenter,
        travelMode: 'DRIVING'
        }, function(response, status) {
        if (status === 'OK') {
            const drivingDistance = response.routes[0].legs[0].distance.value / 1000; 
            console.log(drivingDistance)
            directionsRenderer.setDirections(response)
            document.getElementById("locationDistance").textContent = "Distance from Port: " + drivingDistance.toFixed(3) + "km / " + (drivingDistance*0.621371).toFixed(3) + " miles";

        } else {
            window.alert('Directions request failed due to ' + status);
        }
        });
    }

    //document.getElementById('locationOutskirt').textContent = 'Port Outskirt limit: ' + newOutskirtKm + ' km / ' + newOutskirtMiles + ' miles';


}

// Implement the searchPlaces function to handle address searching
function searchPlaces(my_query) {
    if (!my_query) {
        console.error('No address provided for the search.');
        return;
    }

    service.textSearch({ query: my_query }, function(results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            searchbar_results = results;
            displayGoogleMapSearchResults(results);
        } else {
            document.getElementById('results').innerHTML = 'No results found';
        }
    });

    if (sheetData){
        const options = {
            includeScore: true,
            keys: ['LocationName'],
            threshold: 0.4 // This is the "fuzziness" threshold. Lower means more strict matching.
          };
        const fuse = new Fuse(sheetData, options);
        const results = fuse.search(my_query);
        displayKeywordSearchResults(results.map(result => result.item))
    }

}

function displayKeywordSearchResults(results){
    const resultsList = document.getElementById("keywordMatches").querySelector(".list-group");
    resultsList.innerHTML = '';
    results.slice(0, 3).forEach(result => {
        const li = document.createElement("li");
        li.classList.add("list-group-item");
        li.innerHTML = result.LocationName; 
        li.href="#";
        li.addEventListener('click', function() {
            document.getElementById('searchbar').value = result.LocationName
            refreshCurrentMarker({lat: result.Latitude, lng: result.Longitude},result.LocationName)
            updatelocationMetrics();
            updateSheetMarkers(document.getElementById('radiusSlider').value)
            updateKeywordMatchDetails(result, true)
        })
        resultsList.appendChild(li);
    });
}

function updateKeywordMatchDetails(location, isKeywordMatch) {
    const detailsDiv = document.getElementById('keywordMatchDetails');
    detailsDiv.innerHTML = ''; // Clear existing content
    let content;

    if (isKeywordMatch){
        content = `
        <div>
            <h6><strong>${location.LocationName}</strong></h6>
            <div><strong>Port of Discharge: </strong>${location.PortOfDischarge}</div>
            <div><strong>Area Type: </strong>${location.Area}</div>
            <div><strong>Distance Detail: </strong>${location.DistanceDetail}</div>
            <div><strong>Rate (RM): </strong>${location.Rate}</div>
            <div><strong>Rate Details: </strong>${location.RateDetails}</div>
            <div><strong>Minimum: </strong>${location.Minimum}</div>
            <div><strong>Transit Details: </strong>${location.TransitDetails}</div>
        </div>
    `;
    } else{
        content = `
        <div>
            <h6><strong>${location.LocationName}</strong></h6>
            <div><strong>(Google Search Result)</strong></div>
            <div>unknown shipment charge and details</div>
            <div><strong>Address: </strong>${location.Area}</div>
        </div>
    `;
    }
    
    detailsDiv.innerHTML = content;
}


function displayGoogleMapSearchResults(results) {
    var dropdown = document.getElementById('results');
    dropdown.innerHTML = ''; // Clear previous results
    results.forEach(function(place) {
        var placeDiv = document.createElement('div');
        placeDiv.innerHTML = place.name;
        placeDiv.className = 'dropdown-item';
        placeDiv.href = '#';
        placeDiv.addEventListener('click', function() {
            document.getElementById('searchbar').value = place.name
            console.log(place)
            refreshCurrentMarker({lat:place.geometry.location.lat(),lng:place.geometry.location.lng()} ,place.name)
            updatelocationMetrics();
            updateSheetMarkers(document.getElementById('radiusSlider').value)
            updateKeywordMatchDetails({LocationName:place.name,Area: place.formatted_address}, false)
        });
        dropdown.appendChild(placeDiv);
    });
    dropdown.classList.add('show'); // Show the dropdown
}

const R = 6371; // Earth radius in km

function haversineDistance(lat1, lon1, lat2, lon2) {
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const output =  R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    return parseFloat(output.toFixed(4))
}




$(document).ready(function() {
    // Open Modal
    $("#openModalButton").click(function() {
        $("#myModal").modal('show');
        document.getElementById("form_locationName").value = currLocationName
        
    });

    // Close Modal on Confirm Button
    $("#confirmButton").click(function() {
        $("#myModal").modal('hide');
    });
});

// 
// To read data from the sheet

async function loadDataAndInitMap() {
    try {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            let selectedLat = 3.2627169;
            let selectedLon = 113.0673422;
            const headers = data.values[0];
            const rows = data.values.slice(1);

            const processedData = rows.map(row => {
                while (row.length < headers.length) {
                    row.push("-"); 
                }
                return row.map(cell => cell === "" ? "-" : cell);
            });
            // Convert rows to objects
            sheetData = processedData.map(row => _.zipObject(headers, row));

            sheetData.forEach(row => {
                row["Latitude"] = parseFloat(row["Latitude"]);
                row["Longitude"] = parseFloat(row["Longitude"]);
                row["Distance"] = haversineDistance(row["Latitude"], row["Longitude"], selectedLat, selectedLon);
            });
        })
        .catch(error => console.error('Error fetching data:', error)
        );
        await initMap();

    } catch (error) {
        console.error("Error fetching data or initializing map:", error);
    }
}



function updateSheetMarkers(radius){
    sheetMarkers.forEach(marker => marker.setMap(null));
    sheetMarkers = [];
    sheetData.forEach(row => {
        row["Distance"] = haversineDistance(row["Latitude"], row["Longitude"], currCenter.lat, currCenter.lng);
    });
    const locationsWithinRange = sheetData.filter(row => row.Distance <= radius);
    locationsWithinRange.forEach(location => {
        if (location.LocationName == currLocationName) {return}
        const marker = new google.maps.Marker({
            position: { lat: location.Latitude, lng: location.Longitude },
            map: map,
            title: location.LocationName,
            icon: './blue_pin.png'
        });
        
        marker.addListener('click', () => {
            const infoContent = `
                <div>
                    <h3><strong><span>${location.LocationName}</strong></h3>
                    <h5>Via: </strong>${location.PortOfDischarge}<strong></h5>
                    <h6><strong>Area Type: </strong>${location.Area}</h6>
                    <p><strong>Distance Detail: </strong>${location.DistanceDetail}</p>
                    <p><strong>Rate (RM): </strong>${location.Rate}</p>
                    <p><strong>Rate Details: </strong>${location.RateDetails}</p>
                    <p><strong>Minimum: </strong>${location.Minimum}</p>
                    <p><strong>Transit Details: </strong>${location.TransitDetails}</p>
                </div>
            `;
    
            infowindow.setContent(infoContent);
            infowindow.open(map, marker);
        });

        sheetMarkers.push(marker);
    });

}




function handleCredentialResponse(response) {
    // Send the ID token to your server for validation
    console.log("ENcoded JWT IF token: " +   response.credential);
    initClient();

}

window.onload = function() {
    google.accounts.id.initialize({
        client_id: '1098476773710-9g2gq06se834h1b0l16q59v4vvhoh66e.apps.googleusercontent.com',
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.getElementById('g_id_signin'),
        { theme: 'outline', size: 'large' }
    );

};

function initClient() {
    //gapi.auth2.init
    gapi.auth2.getAuthInstance({
        apiKey: apiKey,
        clientId: '1098476773710-9g2gq06se834h1b0l16q59v4vvhoh66e.apps.googleusercontent.com',
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
        scope: "https://www.googleapis.com/auth/spreadsheets"
    }).then(function () {
        // API and client library loaded and initialized, now you can use the Google Sheets API
        console.log('it worked')
    }, function(error) {
        console.error("Error loading GAPI client for API", error);
    });
}





