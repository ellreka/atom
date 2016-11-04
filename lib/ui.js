"use strict";

const {CompositeDisposable, Disposable, Emitter} = require("atom");


class UI {
	
	init(){
		this.lightTheme  = false;
		this.emitter     = new Emitter();
		this.disposables = new CompositeDisposable(
			atom.themes.onDidChangeActiveThemes(_=> {
				setImmediate(_=> this.checkMotif());
				this.fixOffset();
			})
		);
	}
	
	
	reset(){
		this.disposables.dispose();
		this.disposables = null;
		this.emitter.dispose();
		this.emitter = null;
	}


	observe(){
		this.disposables.add(
			atom.workspace.observeTextEditors(editor => {
				this.emitter.emit("open-editor", editor);
				
				const path = editor.buffer.getPath();
				path
					? this.emitter.emit("open-file",  editor, path)
					: this.emitter.emit("open-blank", editor);
			})
		);
	}
	
	
	onMotifChanged(fn){
		return this.emitter.on("motif-changed", fn);
	}
	
	onOpenEditor(fn){
		return this.emitter.on("open-editor", fn);
	}
	
	onOpenFile(fn){
		return this.emitter.on("open-file", fn);
	}

	onOpenBlank(fn){
		return this.emitter.on("open-blank", fn);
	}


	checkMotif(){
		
		// Spawn a dummy node, snag its computed style, then shoot it
		const node = document.createElement("div");
		node.className = "theme-colour-check";
		document.body.appendChild(node);
		const colour = window.getComputedStyle(node).backgroundColor;
		node.remove();
		
		// Coerce the "rgb(1, 2, 3)" pattern into an HSL array
		const rgb = colour.match(/[\d.]+(?=[,)])/g);
		const hsl = this.rgbToHSL(rgb);
		const isLight = hsl[2] >= .5;
		
		if(isLight !== this.lightTheme){
			this.lightTheme = isLight;
			this.emitter.emit("motif-changed", isLight);
		}
	}
	
	
	/**
	 * Convert an RGB colour to HSL.
	 *
	 * @param {Array} channels - An array holding each RGB component
	 * @return {Array}
	 */
	rgbToHSL(channels){
		if(!channels) return;
		
		const r     = channels[0] / 255;
		const g     = channels[1] / 255;
		const b     = channels[2] / 255;
		const min   = Math.min(r, g, b);
		const max   = Math.max(r, g, b);
		const lum   = (max + min) / 2;
		const delta = max - min;
		const sat   = lum < .5
			? (delta / (max + min))
			: (delta / (2 - max - min));
		
		let hue;
		switch(max){
			case r:  hue =     (g - b) / delta; break;
			case g:  hue = 2 + (b - r) / delta; break;
			default: hue = 4 + (r - g) / delta; break;
		}
		
		hue /= 6;
		
		if(hue < 0)
			hue += 1;
		
		return [ hue || 0, sat || 0, lum || 0 ];
	}
	
	
	fixOffset(){
		const styles    = document.styleSheets;
		const numStyles = styles.length;
		
		for(let s = 0; s < numStyles; ++s){
			const rules    = styles[s].cssRules;
			const numRules = rules.length;
			
			for(let r = 0; r < numRules; ++r){
				const selector = ".list-group .icon::before, .list-tree .icon::before";
				const rule = rules[r];
				
				if(rule.selectorText === selector && rule.style.top){
					const offset = rule.style.top;
					rule.style.top = "";
					
					if(this.restoreOffset){
						this.restoreOffset.dispose();
						this.disposables.remove(this.restoreOffset);
					}
					
					this.restoreOffset = new Disposable(_=> rule.style.top = offset);
					this.disposables.add(this.restoreOffset);
					return;
				}
			}
		}
	}
}


module.exports = new UI();