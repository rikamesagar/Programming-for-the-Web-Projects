DOC =		assgn

HOME_DIR =	../..

TEMPLATE_DIR =  $(HOME_DIR)/assets/umt

TARGETS = 	$(DOC).html $(DOC).pdf

all:		$(TARGETS)

.phony:		clean

clean:
		rm -rf *~ $(DOC) $(TARGETS) *.toc *.snm *.nav

%.html:		%.umt
		umt -D HOME=$(HOME_DIR) \
		  $(TEMPLATE_DIR)/article-template.html $< $@

%.pdf:		%.umt
		umt -D HOME=$(HOME_DIR)  \
		  $(TEMPLATE_DIR)/article-template.tex $< $@
