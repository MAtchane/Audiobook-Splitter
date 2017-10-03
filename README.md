# Audiobook-Splitter
A simple node app aimed to split long audiobooks to ease navigation on old devices (nokia s40...)

This project was built with a lighter version of the existing mp3-split module, if you're interested in more features make sure to check it out https://github.com/skiptirengu/mp3-split

Requirements

ffmpeg is what makes the heavy lifting so make sure you have it installed and added to your path.

Usage

Type node app.js -h to list all options and see an usage example. 

Existing options:

-i input: the mp3 file path, Required.

-o output: a directory where the resulted parts will be stored (./ is the default value)

*you should only use one of the next three options.*

-n number: number of parts.

-l lenght: the desired lenght for each of the parts.

-t template:

The template file format should be in the following format. For more info, checkout ffmpeg's duration syntax page.

[([hh:]mm:ss[.ms...])] Chapter_name


A template file usually looks like this:

[00:00:00] Chap01

[01:20:30] Chap02

[02:44:28] Chap03

[03:05:52] Chap04

[04:27:52] Chap05


---------------------------------------------------
@todo

*frendlier options*

*support for other formats*
