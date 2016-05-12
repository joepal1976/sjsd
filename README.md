# Simplified JavaScript Docs

SJSD, Simplified JavaScript Documentation, is a tool for generating code documentation from inline source code comments. 
Contrary to other similar tools, it does not attempt to make a source code analysis. It instead leaves to the user to 
decide how to structure the documentation of the code.

SJSD shares much of the syntax with JSDoc (but is not necessarily 100% compatible).

Note that this project is currently in an alpha stage and probably not fit for use in production.

## Documentation

The documentation for SJSD is (obviously) generated with SJSD. It's available here: https://joepal1976.github.io/sjsd/docs/index.html

At that location you can find instructions and examples. (Well, at least when we've gotten as far as writing those)

## Q & A

These are some points which might be informative, but which are not part of the documentation as such.

### Who is responsible for SJSD? 

SJSD is maintained and sponsored by Data Collection AB (DCAB, see https://www.datacollection.se), a swedish limited liability company 
working with systems developent and research within social sciences. 

### Is there any form of support available?

If you have an issue or a question, post it in the issue section. The post will usually be handled in a timely manner.

If you're truly desperate, you can try to contact DCAB for paid support, but this is something we only intend to be 
used in exceptional cases. 

### What is the policy towards suggestions, pull requests and contributions?

We aim at being open and welcoming towards external input. Give it a try and we'll discuss the matter.

### What was the reason for creating SJSD in the first place? Doesn't JSDoc already do all this?

The background is that we were trying to use JSDoc to document an AMD module. However after having spent most of a day trying
(and failing) to generate docs for an inner class wrapped in an an inner variable created for supporting several 
module formats at once, we gave up on ever getting JSDoc to understand what we wanted.

Since we felt that the problem in our case was that JSDoc was trying to read and understand the code rather than just 
listen to what we were trying say, we wrote a quick hack which instead pulled the comment blocks
and parsed them without even attempting to figure out the underlying code structure. 

A few improvements/iterations later, there was a draft of SJSD. 

### What is the principal difference between SJSD and JSDoc?

SJSD won't even try to make a code analysis. It'll trust that you specify everything necessary in the comment blocks.

The upside is that you have full control over how stuff ends up and where you write it. You don't need to write comment blocks in 
any particular place, and if you say a function is named XYZ while the code as such says it is named ABC, then SJSD will trust you 
know what you're doing.

The downside is that you also won't get any help whatsoever in, for example, automatically detecting function parameters or inheritance.
SJSD will expect you to write a full definition for each thing you want to document. 

All in all, SJSD has a much more relaxed attitude towards code structure. If you tell it things belong together in a certain manner, or
have particular names, then that will simply be swallowed no matter if it makes sense or not.

### Should I use SJSD or JSDoc?

JSDoc is a mature product used in many projects. If it works for you, then by all means use that. 

If JSDoc makes you frustrated, then that might be an indication you should give SJSD a chance. 

### What is the relation between SJSD and JSDoc?

There is pretty much none. Much of the syntax was borrowed from JSDoc, but apart from that there is no particular relation.
It is not a design goal to maintain any compatibility between the two.

### Is SJSD a fork of JSDoc, and/or does it share any code?

No, SJSD was written from scratch and does not share any code with JSDoc.

