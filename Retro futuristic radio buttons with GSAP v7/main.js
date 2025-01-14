class RadioButtonEffect {
    constructor(radioBtnGroups) {
      this.previousRadioBtn = null;
  
      radioBtnGroups.forEach((group) => {
        const radioBtn = gsap.utils.selector(group)("input[type='radio']")[0];
  
        radioBtn.addEventListener("change", () => {
          const nodes = this.getNodes(radioBtn);
  
          if (this.previousRadioBtn && this.previousRadioBtn !== radioBtn) {
            this.changeEffect(this.getNodes(this.previousRadioBtn), false);
          }
  
          this.changeEffect(nodes, true);
          this.previousRadioBtn = radioBtn;
        });
      });
    }
  
    getNodes(radioBtn) {
      const container = radioBtn.closest(".radio-btn-group");
      return [
        gsap.utils.shuffle(gsap.utils.selector(container)(".blue rect")),
        gsap.utils.shuffle(gsap.utils.selector(container)(".pink rect"))
      ];
    }
  
    changeEffect(nodes, isChecked) {
      gsap.to(nodes[0], {
        duration: 0.8,
        ease: "elastic.out(1, 0.3)",
        xPercent: isChecked ? "100" : "-100",
        stagger: 0.01,
        overwrite: true,
        delay: 0.13
      });
  
      gsap.to(nodes[1], {
        duration: 0.8,
        ease: "elastic.out(1, 0.3)",
        xPercent: isChecked ? "100" : "-100",
        stagger: 0.01,
        overwrite: true
      });
    }
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    const radioBtnGroups = document.querySelectorAll(".radio-btn-group");
    new RadioButtonEffect(radioBtnGroups);
  });
  