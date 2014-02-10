/* 
 * The MIT License
 *
 * Copyright 2014 MrPoxipol.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

$(document).ready(function() {
    //DEFINES
    var TARGET_COST = 50;
    
    var c = {
        name: "",
        canvas: null,
        ctx: null,
        w: null,
        h: null,
        frameTime: 1000/60,
        cursor_size: 32,
        document: document.body
    };
    initCanvas();
    
    var app = {
        state: "menu",
        step: 0, // Steb for background animation
        bg: new Sprite("img/bg.png"),
        bg_cp: new Sprite("img/bg.png", new Vector2D(-c.w, 0))
    };

    var menu = {
        author_text: new Text("2014 by MrPoxipol", new Font("Source Sans Pro", 22), "white", new Vector2D(c.w-170, c.h-35))
    };
    
    var g = {
        // GAME - TARGETS
        spawns: new Array(new Vector3D(711, 361, 90), new Vector3D(15, 308, 0)), // template: x, y, rotation
        targets_act: new Array(),
        gen_clock: new Clock(),
        gen_time: 2000, // ms
        autokill_time: 3000, // ms - How many ms killtarget is showed.
        afterkill_time: 200, // ms - after kill time (dead pony time),
        
        // Punishment
        redscreen_clock: new Clock(),
        redscreen_time: 500, // ms - time of showing red screen (blood)
        redscreen_active: false,
        redscreen_rect: new Rect(new Vector2D(0, 0), new Vector2D(c.w, c.h), "#FF0000"),
        
        score: 0,
        health_points: 100,

        /* TEXTS */
        text: {
            score: new Text("Score: 0", new Font("Ubuntu", 24), "black", new Vector2D(10, 10))
        },
        gfx: {
            house: new Sprite("img/house.png", new Vector2D(490, 185)),
            tree: new Sprite("img/tree.png", new Vector2D(64, 256)),
            bushes: new Sprite("img/bushes.png", new Vector2D(-71, 343))
        },
        audio: {
            shot: new Audio("audio/shots/shotgun.wav"),
            pain: new Audio("audio/pain/pain2.wav")
        }
    };
    
    var user = {
        shoted: false
    };
    
    function KillTarget(spawn_id) {
        this.dead = false;
        this.sprite = new Sprite("img/pony.png");
        this.spawn_id = spawn_id;
        this.sprite.pos = new Vector2D(g.spawns[spawn_id].x, g.spawns[spawn_id].y);
        this.sprite.rotate(g.spawns[spawn_id].z);
        this.clock = new Clock();
    }
    // pony :D
    // Events
    function onClick(e) {
        var position = $(c.name).position();
        var mpos = new Vector2D(e.pageX - position.left + c.cursor_size/2, e.pageY - position.top + c.cursor_size/2);
        
        if (g.audio.shot.ended || !user.shoted) {
            /* Chrome 'bug' 
             * Info: http://stackoverflow.com/a/8959342/2221315*/
            if(window.chrome)
                g.audio.shot.load();
            
            g.audio.shot.play();
            user.shoted = true;
            if(app.state === "game") {
                // Shoting
                for(i = 0; i < g.targets_act.length; ++i)
                    if(g.targets_act[i].sprite.getGlobalBounds().contains(mpos))
                        targetEliminate(i);
            }
        }
    }

    function getKillTargetOnSpawn(spawn_id) {
        for (i = 0; i < g.targets_act.length; ++i)
            if (g.targets_act[i].spawn_id === spawn_id)
                return i;

        return -1;
    }

    function generateKillTarget() {
        if (g.targets_act.length >= g.spawns.length)
            return true; // No enought place for next target. STOP.

        var spawn_id = getRandomInt(0, g.spawns.length - 1);
        // Checking, is any killtarget on this spawn.
        if (getKillTargetOnSpawn(spawn_id) !== -1)
            return false;

        g.targets_act.push(new KillTarget(spawn_id));

        return true;
    }

    function targetEliminate(index) {
        console.log("Enemy eliminated!");
        g.score += TARGET_COST;
        g.targets_act[index].dead = true;
        g.targets_act[index].sprite.setTexture("img/dead_pony.png");
        g.targets_act[index].clock.restart();
    }

    function notKilledTargetPunishment() {
        if(window.chrome)
            g.audio.pain.load();

        g.audio.pain.play();
        g.score -= 100;
        g.health_points -= getRandomInt(10, 30); // HAHA, RANDOM!
        g.redscreen_active = true;
        g.redscreen_clock.restart();
    }

    function updateKillTargets() {
        var to_delete = new Array(); // delete? which? requires for sequrity
        for (i in g.targets_act) {
            // Autokill
            if(g.targets_act[i].clock.getElapsedTime() >= g.autokill_time)
                to_delete.push(i);
            
            // if killed (dead texture)
            if(g.targets_act[i].dead && g.targets_act[i].clock.getElapsedTime() >= g.afterkill_time)
                to_delete.push(i);
        }
        
        for(i in to_delete) {
            if(!g.targets_act[i].dead)
                notKilledTargetPunishment();
            
            g.targets_act.splice(i, 1);
        }
    }

    function drawKillTargets() {
        for (var i = 0; i < g.targets_act.length; ++i)
            g.targets_act[i].sprite.draw(c.ctx);
    }
    
    function drawScene() {
        g.gfx.house.draw(c.ctx);
        g.gfx.bushes.draw(c.ctx);
        g.gfx.tree.draw(c.ctx);
    }
    
    function moveBackground() {
        app.step += 0.5;
        app.bg.pos.x = -(app.step*0.6);
        app.bg.pos.x %= 800*2;
        if(app.bg.pos.x < 0) app.bg.pos.x += 800*2;
        app.bg.pos.x -= 800;
        app.bg.pos.x = Math.floor(app.bg.pos.x);
        
        app.bg_cp.pos.x = -(app.step*0.6) + 800;
        app.bg_cp.pos.x %= 800*2;
        if(app.bg_cp.pos.x < 0) app.bg_cp.pos.x += 800*2;
        app.bg_cp.pos.x -= 800;
        app.bg_cp.pos.x = Math.floor(app.bg_cp.pos.x);
        
        requestAnimationFrame(moveBackground);
    }
    
    function logic() {
        if(app.state === "game") {
            if (g.redscreen_active) {
                g.redscreen_active = (g.redscreen_clock.getElapsedTime() <= g.redscreen_time);
            }
            
            if (g.gen_clock.getElapsedTime() >= g.gen_time) {
                while(!generateKillTarget()){}
                g.gen_clock.restart();
            }

            g.text.score.string = "Score: " + g.score;
            updateKillTargets();
        }
    }

    function paint() {
        logic();
        c.ctx.fillStyle = "#000";
        c.ctx.fillRect(0, 0, c.w, c.h);
        // Drawing content
        // Background animation:
        app.bg.draw(c.ctx);
        app.bg_cp.draw(c.ctx);
        if(app.state === "game") {
            drawKillTargets();
            drawScene();
            g.text.score.draw(c.ctx);
            
            if(g.redscreen_active) {
                // Transparent
                c.ctx.globalAlpha = 0.8;
                g.redscreen_rect.draw(c.ctx);
                c.ctx.globalAlpha = 1.0;
            }
        }
        else if(app.state === "menu")
        {
            
            c.ctx.globalAlpha = 0.624;
            c.ctx.fillStyle = 'black';
            c.ctx.fillRect(0, 0, c.w, c.h);
            c.ctx.globalAlpha = 1.0;
            
            gui.draw("menu");
        }
        
        if (app.state !== "game")
            menu.author_text.draw(c.ctx);
        
        requestAnimationFrame(paint);
    }

    function preloadData() {
        var images = ["img/pony.png", "img/dead_pony.png"];
        for(var i in images) {
            var img = new Image();
            img.src = images[i];
            c.ctx.drawImage(img, 0, 0, 0, 0);
        }
    }
    // GUI Callbacks
    function onMenuStartButtonClicked() {
        app.state = "game";
        gui.setScene("game");
        console.log("clicked!");
    }

    function initCanvas() {
        // Canvas init
        c.document.style.cursor = "url('img/cursor.png'), default";

        c.name = "#screen";
        c.canvas = $(c.name)[0];
        c.ctx = c.canvas.getContext("2d");
        c.w = $(c.name).width();
        c.h = $(c.name).height();
        // Events init
        c.canvas.addEventListener("click", onClick, false);
        
        gui.setup(c.canvas, c.ctx, "menu", 0.5*c.cursor_size);
        var menu_start_button = new Button("Play!", new Vector2D(325, 220));
            menu_start_button.click(onMenuStartButtonClicked);
            
        gui.addButton(menu_start_button, "menu");
    }

    function init() {
        preloadData();
        requestAnimationFrame(paint);
        requestAnimationFrame(moveBackground);
    }
    
    init();
});
