({
  name: 'editing-interface/main.js',
  out: 'main-built.js',
  paths: {
    jquery: 'lib/jquery-1.11.0.min',
    underscore: 'lib/underscore-min',
    backbone: 'lib/backbone-min',
    canvas2Image: 'lib/canvas2image',
    text: 'lib/text',
    jquerySmoothScroll: 'lib/jquery.smooth-scroll',
    jscrollpane: 'lib/jquery.jscrollpane.min',
    filesaver: 'lib/FileSaver',
    jmousewheel: 'lib/jquery.mousewheel',
    jform: 'lib/jquery.form.min',
    toastr: 'lib/toastr',
    jmenu: 'lib/jquery.contextmenu',
    micromodal: 'lib/micromodal.min',
  },
  shim: {
    jmenu: ['jquery'],
    jmousewheel: ['jquery'],
    jform: ['jquery'],
    filesaver: {
      exports: ['saveAs', 'Blob'],
    },
    jscrollpane: ['jquery', 'jmousewheel'],
    underscore: {
      exports: '_',
    },
    jquerySmoothScroll: {
      deps: ['jquery'],
    },
    backbone: {
      deps: ['underscore', 'jquery'],
      exports: 'Backbone',
    },
  },
});
