# subslider.js
A script to fix out of sync subtitles - in javascript

What it is for
==============
This script can be used to easily fix subtitle files that aren't synced with 
the audio.

How to use it
=============
Just navigate to [this page](http://micheleb.github.io/subslider.js/) and follow
the instructions, or checkout this repo and open `index.html` in your favorite 
browser.

As the instructions say, the process is simple:

1. Load your subtitles file (nothing is uploaded, there is no backend server 
involved)
2. Find a dialog in the video, and take note of the timestamp at which it starts
3. Find that same dialog in the subslider.js page, and select it
4. Change the subtitle's _start_ field so that it matches the beginning of 
the dialog
5. Press submit and either download the edited .srt file, 
or copy/paste its content to a new file

License
=======
subslider.js is released under the GPLv2 license, the libraries that it uses are
released under different licenses. Every library is included along with its
original `LICENSE` file. All libraries are stored inside the `lib` folder.

Credits
=======
Michael Bromley for his [Angular Pagination module][1] (and of course, to all
the developers he credited for his module)

[1]: https://github.com/michaelbromley/angularUtils/tree/master/src/directives/pagination

