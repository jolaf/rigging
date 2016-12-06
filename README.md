# rigging

(ENGLISH)

Trainer software for tall ships rigging elements location.

For now the only supported tallship is Russian frigate [Shtandart](https://www.shtandart.ru/frigate/).

The software is written in HTML/CSS/JavaScript/ES5/jQuery and is supposed to be compiled into a single HTML file (including images) to be easily deployable and run offline, including onboard a tall ship at sea. :)

The software thus is easily run from the repository without any installation, here's the [current version for Shtandart](https://rawgit.com/jolaf/rigging/master/shtandart.html).

To re-compile from source files, put [jQuery library](http://jquery.com/download/) (slim-min version is enough) to the project folder and run

```
python build.py
```

For now the software is in Russian language only, sorry. And Google Translate for sites won't help also, sorry.

---

(RUSSIAN)

Программа-тренажёр для облегчения изучения и выучивания мест расположения рабочих концов бегучего такелажа на парусных судах.

На данный момент программа реализована для единственного корабля &ndash; русского фрегата [«Штандарт»](https://www.shtandart.ru/frigate/).

Программа написана на HTML/CSS/JavaScript/ES5/jQuery и собирается в единый HTML-файл (вместе с картинками), чтобы её было легко копировать и использовать в отсутствии Интернета, в том числе на борту парусника в море. :)

Программа может быть запущена прямо из репозитория без всякой инсталляции, например, вот [актуальная версия для «Штандарта»](https://rawgit.com/jolaf/rigging/master/shtandart.html).

Чтобы пересобрать программу из исходных файлов, положите [файл библиотеки jQuery](http://jquery.com/download/) (достаточно версии slim-min) в директорию проекта и запустите

```
python build.py
```
