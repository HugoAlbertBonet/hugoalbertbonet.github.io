python3 ./scripts/build_from_src.py && \
git add * && \
git commit -m "${1:-Update website}" && \
git push origin main 