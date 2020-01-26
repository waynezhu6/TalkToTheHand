const inputs = document.querySelectorAll('.input');
// const SignUpButton = document.getElementById("aaa").href;
// const logInContainer = document.getElementsByClassName("login-container");
var x = document.getElementById("login");
var y = document.getElementById("register");

function focusFunc(){
    let parent  = this.parentNode.parentNode;
    parent.classList.add('focus');
}

function blurFunc(){
    let parent  = this.parentNode.parentNode;
    if (this.value == ""){
        parent.classList.remove('focus');
    }
}

inputs.forEach(input => {
    input.addEventListener('focus', focusFunc);
    input.addEventListener('blur', blurFunc);
});

function register(){
    x.style.transform = "translateX(-500%)";
    y.style.transform = "translateX(-50%)";
}
function login(){
    x.style.transform = "translateX(50%)";
    y.style.transform = "translateX(500%)";
}

function scroll_down(){
    window.scrollTo(0,document.body.scrollHeight);
}



