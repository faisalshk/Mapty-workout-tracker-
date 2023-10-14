'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
let map, mapEvent;

//parent classess
class Workout {
  data = new Date();
  id = (Date.now() + '').slice(-10);
  constructor(cords, distance, duration) {
    this.cords = cords; //[lat,lng]
    this.distance = distance; //in kms
    this.duration = duration; //in mins
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.data.getMonth()]
    } ${this.data.getDate()}`;
  }
}

//child classes
class Running extends Workout {
  type = 'running';
  constructor(cords, distance, duration, candence) {
    super(cords, distance, duration);
    this.candence = candence;
    this.calcPace();
    this._setDescription();
  }
  //calculating pace
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(cords, distance, duration, elevationGain) {
    super(cords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  //calculating speed
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//dry run
// const run = new Running([38, -12], 5, 50, 130);
// const cycle = new Cycling([38, -12], 35, 120, 530);
// console.log(run, cycle);
//////////////////////////////////////////////////////////////
//Application Architecture
class App {
  //using the bind() method and setting the this keyword to point at the app class, in every method
  //private property
  #map;
  #mapEvent;
  #mapZoom = 13;
  #workout = [];
  //the constructor is empty because the app class does not require any input
  constructor() {
    // Get position
    this._getPosition();

    //Get data Form Local Stroage
    this._getLocalStroage();

    // Event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElementField);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  //Methods
  //using the bind() Method because in regular function call the this keyword is undefined.
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not access the location!!!');
        }
      );
    }
  }

  _loadMap(position) {
    console.log(position);

    const { latitude } = position.coords;
    const { longitude } = position.coords;
    //note this data is not 100% accurate
    console.log(latitude, longitude);
    console.log(`https://www.google.com/maps/@19${latitude},${longitude}`);

    // Implementing Map$************
    const cords = [latitude, longitude];

    // console.log(this);
    this.#map = L.map('map').setView(cords, this.#mapZoom);
    L.tileLayer('https://tile.openstreetmap.fr/hot//{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
    // loopin the workout array and render the marker
    this.#workout.forEach(work => this._renderWorkouMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //Clear input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElementField() {
    //Selecting the Closest parent html element which in this case is the '.form__row' and then toggleing the hidden class
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  //Adding Workout
  _newWorkout(e) {
    e.preventDefault();
    //the every method will loop over the array and if all the inputs are numbers and will true if yes and false if no

    //Helper functions
    const ValidInput = (...input) => input.every(inp => Number.isFinite(inp));

    const allPositive = (...input) => input.every(inp => inp > 0);

    // Get data from the form
    const type = inputType.value;

    //converting to String using +
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If Working is running, create a running object
    if (type === 'running') {
      const candence = +inputCadence.value;
      // Check if the data is Valid
      //using a guard clause
      // a guard clause is basically checking for the opposite condition if it is ture then return the function immdiately
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(candence)
        !ValidInput(distance, duration, candence) ||
        !allPositive(distance, duration, candence)
      ) {
        inputDistance.value =
          inputDuration.value =
          inputCadence.value =
          inputElevation.value =
            '';
        return alert('Enter valid input!!!');
      }
      workout = new Running([lat, lng], distance, duration, candence);
      this.#workout.push(workout);
    }

    // If Working is cycling, create a cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !ValidInput(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Enter valid input!!!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //Add a new object to the workout array
    this.#workout.push(workout);
    console.log(workout);

    // Render workout on the map as a marker
    this._renderWorkouMarker(workout);

    //Render workout in the List
    this._renderWorkout(workout);

    // Hide the form and clear the input fields
    this._hideForm(workout);

    // Set LocalStorage to all workouts
    this._setLoclStorage();
  }

  _renderWorkouMarker(workout) {
    console.log(workout.type);
    L.marker(workout.cords)
      .addTo(this.#map)
      //adding a popup on the marker
      .bindPopup(
        //customizing the popup
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false, //closes popup when clicked in the map is set to false
          className: `${workout.type}-popup`, //css classname
        })
      )
      //For popup content
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
      `;
    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.candence}</span>
        <span class="workout__unit">spm</span>
      </div>`;

      form.insertAdjacentHTML('afterend', html);
    }
    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>`;
      form.insertAdjacentHTML('afterend', html);
    }
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workout.find(
      work => work.id === workoutEl.dataset.id
    );
    // The setView() is leaflet method which is used to move the map to the location
    this.#map.setView(workout.cords, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    console.log(workout);
  }

  _setLoclStorage() {
    // LocalStorage is used to store data in the browser
    // It stores data in a key value pair, and both needs to be in string format
    // that is why we are JSON.stringify to convert the workout array into string
    localStorage.setItem('workout', JSON.stringify(this.#workout));
    //note - do not use local storage for large amount of data because it will slow down your application
    // and it also does blocking
  }

  _getLocalStroage() {
    //JSON.parse() converts the string into the array format as it was earlier
    const data = JSON.parse(localStorage.getItem('workout'));
    console.log(data);
    if (!data) return;

    // storing the data of the localstorage into the workout array because when we load the page for the first time the workout array is empty that is why we are storing the data in the array
    this.#workout = data;
    // looping through each element in the array and call the renderworkout method to render the workouts in the array when load the page so that all the data in the local storage will displayed here
    this.#workout.forEach(
      work => this._renderWorkout(work)
      // the below will not work because, we are call the getlocalstorage method in the constructor and when a method is called in the constructor it executes as soon as the page loades and when the page loads it take time to for the map to appear and we cannot render the marker when the map is not available, therefore we need to render the marker after the map loads
      // now we need to move the below code in the loadMap method
      // this._renderWorkouMarker(work)

      //Note - Whne we work with localstorage there is a big problem, when we convert the object to string and then string to object we loose the prototype chain hence we cannot access all the methods we created this is a big problem with local storage in OOP
      // to solve this we need to create the Running and cycling object again.
    );
  }

  //Public Method which can be accessed outside the class
  //reset the localStorage
  reset() {
    //this will remove every item from local storage
    localStorage.removeItem('workout');
    //this will then reload the page
    location.reload();
  }
}
const app = new App();

/*// unstructure code
// getting Location
Working of geoLocation********
// the .getCurrentPostion() func accepts 2 callback function a success function and an error function, the first one is success and the second one is erro, the success callback function also accepts an argument which is position
// but first we will check if the navigator.geolocation exists or not

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    function (position) {
      console.log(position);
      //in the output of the position object we wil take langitude and latitude to access the location the other properties are usaually used for mobile phones
      const latitude = position.coords.latitude;
      const { latitude } = position.coords;
      const { longitude } = position.coords;
      //note this data is not 100% accurate
      console.log(latitude, longitude);
      // we are using this coordinates to locate our location and center the map to that location
      console.log(`https://www.google.com/maps/@19${latitude},${longitude}`);

Implementing Map$************

      const cords = [latitude, longitude];
    // Leaflet code from website overview
    // we must pass the ID name of our html map element in the map(ID) method
    // the L below is the main function provided by leaflet as entry point, that is basically a NameSpace like Number,Intl namespaces
    // this L also provide different methods like marker(), tileLayer() etc.
    // the setView([latitude, longitude],zoom in number (13))
      map = L.map('map').setView(cords, 13);
    //   console.log(map);
    // A Map basically consists small tiles and that tiles comes from the below link
    // the openstreetmap is an opensource map
      L.tileLayer('https://tile.openstreetmap.fr/hot//{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

    // the .on() method is used to add an event on the map whenever we click on it. So this event is created by leaflet
      map.on('click', function (mapE) {
        console.log(mapE);
      // storing the latlng of the map when clicked on the map in a global variable so that we use it outside the clicked event
        mapEvent = mapE;
      // when a click on the map happens then show the form
        form.classList.remove('hidden');
        inputDistance.focus();
      // where ever we click on the map the marker will appear
      // for that we are taking lat and long for the mapEvent object, to now the coordinates on the map where the user clicked
      // storing the lat and lng in an object using destructring and then passing it into the marker() method
        const { lat, lng } = mapEvent.latlng;
        L.marker([lat, lng])
          .addTo(map)
          // adding a popup on the marker
          .bindPopup(
          // customizing the popup
            L.popup({
              maxWidth: 250,
              minWidth: 100,
              autoClose: false,
              closeOnClick: false, //closes popup when clicked in the map is set to false
              className: 'running-popup', //css classname
            })
          )
          // For popup content
          .setPopupContent('Workout')
          .openPopup();
      });
    },
    function () {
      alert('Could not access the location!!!');
    }
  );
}

form.addEventListener('submit', function (e) {
  e.preventDefault();
  // Clear input fields
  inputDistance.value =
    inputDuration.value =
    inputCadence.value =
    inputElevation.value =
      '';
  // Display the marker
  // where ever we click on the map the marker will appear
  // for that we are taking lat and long for the mapEvent object, to now the coordinates on the map where the user clicked
  // storing the lat and lng in an object using destructring and then passing it into the marker() method
  
  const { lat, lng } = mapEvent.latlng;
  L.marker([lat, lng])
    .addTo(map)
    // adding a popup on the marker
    .bindPopup(
    // customizing the popup
      L.popup({
        maxWidth: 250,
        minWidth: 100,
        autoClose: false,
        closeOnClick: false, //closes popup when clicked in the map is set to false
        className: 'running-popup', //css classname
      })
    )
  // For popup content
    .setPopupContent('Workout')
    .openPopup();
});

inputType.addEventListener('change', function () {
  // Selecting the Closest parent html element which in this case is the '.form__row' and then toggleing the hidden class
  
  inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
});
*/
