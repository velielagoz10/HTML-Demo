document.addEventListener('DOMContentLoaded', function() {
    document.documentElement.style.transition = 'filter 3s ease-out';
    document.documentElement.style.filter = 'grayscale(0) brightness(1) contrast(1) brightness(1)';
});

function getTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const hours12 = hours % 12;
    return { hours, hours12, minutes, seconds };
}

function getClockRotation() {
    const { hours, minutes } = getTime();
    const thr = hours + ( minutes / 60 ); 
    const totalRotation = 720 * thr /24;
    return totalRotation;
}

function getPercentageOfDay() {
    const pod = getClockRotation() / 720;
    return pod.toFixed(2);
}

document.body.style.setProperty('--rotate-hour', getClockRotation()+90 );
document.body.style.setProperty('--pecentage-of-day', getPercentageOfDay());
document.body.querySelector('.minihud .scene .sky').style.animationDelay = `calc(${ getPercentageOfDay()} * -1s)`;

function showCurrentTime() {
    const { hours12, minutes } = getTime();
    let disHour = hours12
    const timeContainer = document.getElementById('timeContainer');
    if (disHour == 0 ){ disHour = 12; }
    timeContainer.textContent = `${String(disHour)}:${String(minutes).padStart(2, '0')}`;
    
    updateBgColor(getPercentageOfDay());
    document.body.style.setProperty('--rotate-hour', getClockRotation() );
}
showCurrentTime();
setTimeout(function() {
    showCurrentTime();
    setInterval(showCurrentTime, 1000 * 60);
}, (60 - getTime().seconds) * 1000);

function smoothCurve(val) {
    return (1 - Math.cos(2 * Math.PI * val + Math.PI)) / 2;
}
function updateBgColor(percentage) {
    percentage = smoothCurve(percentage);
    const dayColor = getComputedStyle(document.querySelector('body')).getPropertyValue('--clr-d').trim().slice(1).match(/.{2}/g).map(hex => parseInt(hex, 16));
    const nightColor = getComputedStyle(document.querySelector('body')).getPropertyValue('--clr-n').trim().slice(1).match(/.{2}/g).map(hex => parseInt(hex, 16));
    const currentColor = dayColor.map((start, index) => {
        const end = nightColor[index];
        return Math.round(start + percentage * (end - start));
    });
    const currentColorHex = `#${currentColor.map(c => c.toString(16).padStart(2, '0')).join('')}`;
    
    document.querySelector('body').style.setProperty('--clr', currentColorHex);
}
updateBgColor(getPercentageOfDay());

document.querySelectorAll('.hour').forEach(hour => {
    let isDragging = false;
    let lastAngle = null;
    let cumulativeRotation = 0;
    let initialRotation = 0;

    hour.addEventListener('mouseenter', () => {
        hour.classList.add('hovered');
    });

    hour.addEventListener('mouseleave', () => {
        hour.classList.remove('hovered');
    });

    hour.addEventListener('mousedown', (e) => {
        isDragging = true;
        hour.classList.add('dragging');
        e.preventDefault();

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        const angleInRadians = Math.atan2(deltaY, deltaX);
        let angleInDegrees = (angleInRadians * (180 / Math.PI)) + 180;

        initialRotation = parseFloat(getComputedStyle(document.body).getPropertyValue('--rotate-hour').replace('deg', ''));
        lastAngle = angleInDegrees;
        cumulativeRotation = initialRotation;
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const deltaX = e.clientX - centerX;
            const deltaY = e.clientY - centerY;
            const angleInRadians = Math.atan2(deltaY, deltaX);
            let angleInDegrees = (angleInRadians * (180 / Math.PI)) + 180;
            if (lastAngle === null) {
                lastAngle = angleInDegrees;
            }
            let angleDifference = angleInDegrees - lastAngle;
            if (angleDifference > 180) {
                angleDifference -= 360;
            } else if (angleDifference < -180) {
                angleDifference += 360;
            }
            cumulativeRotation += angleDifference;
            if (cumulativeRotation < 0) {
                cumulativeRotation += 720;
            } else if (cumulativeRotation >= 720) {
                cumulativeRotation -= 720;
            }
            lastAngle = angleInDegrees;
            let percentage = (cumulativeRotation / 720).toFixed(3);

            document.body.style.setProperty('--rotate-hour', cumulativeRotation.toFixed(2));
            document.body.style.setProperty('--percentage-of-day', percentage);
            updateBgColor(percentage);
            document.body.querySelector('.minihud .scene .sky').style.animationDelay = `calc(${(cumulativeRotation / 720).toFixed(2)} * -1s)`;
        }
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            setTimeout(function (){
                isDragging = false;
            }, 100); 
            hour.classList.remove('dragging');
            const currentRotation = parseFloat(getComputedStyle(document.body).getPropertyValue('--rotate-hour').replace('deg', ''));
            const degreeIncrement = (getClockRotation()) - currentRotation;

            smoothRotateClock(degreeIncrement, 1000);
        }
    });
});

function smoothRotateClock(degreeIncrement, duration) {
    const startRotation = parseFloat(getComputedStyle(document.body).getPropertyValue('--rotate-hour').replace('deg', ''));
    const frameRate = 60;
    const totalFrames = (duration / 1000) * frameRate;
    let currentFrame = 0;
    function rotate() {
        currentFrame++;
        const progress = currentFrame / totalFrames;
        const currentRotation = startRotation + degreeIncrement * easeInOutCubic(progress);
        document.body.style.setProperty('--rotate-hour', `${currentRotation}`);
        updateBgColor(currentRotation/720);
        document.body.querySelector('.minihud .scene .sky').style.animationDelay = `calc(${currentRotation/720} * -1s)`;
        if (currentFrame < totalFrames) {
            requestAnimationFrame(rotate);
        }
    }
    rotate();
}
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}