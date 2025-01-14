let displayValues = document.querySelectorAll(".num");
    // sets the interval for the counting animation to 4000 milliseconds (4 seconds).
let interval = 4000;

console.log(displayValues);

    // iterates over .num and performs a counting animation for each element.
displayValues.forEach((displayValue) => {
        // This initializes the starting value for the counting animation.
    let startValue = 0;
    let endValue = parseInt(displayValue.getAttribute("data-val"));
    console.log(endValue);
        //  This calculates the duration of each step in the counting animation by dividing the specified interval (4000 milliseconds) by the endValue and rounding down using Math.floor(). This determines how quickly the count increments.
    let duration = Math.floor( interval / endValue );
        // The setInterval function is responsible for animating the counting effect. It increases startValue by 1 in each interval until it reaches endValue, at which point it clears the interval to stop the animation for that specific element.
    let counter = setInterval(function(){
        startValue += 1;
            // This sets up a setInterval timer that increments the startValue, updates the text content of the element with the new value, and clears the interval when startValue reaches endValue.
        displayValue.textContent = startValue;
        if(startValue === endValue){
            clearInterval(counter)
        }
    }, duration);
});

// Overall, this code snippet animates counting for all elements with the class "num" on the web page, using the specified interval and end values provided in the "data-val" attribute of each element.