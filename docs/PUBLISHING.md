# GitHub Pages и colreg.deelstuff.com

Проект — статические HTML, CSS, ES-модули, локальные шрифты и данные. VPS, сервер приложений и база данных для публикации не требуются. Учебный прогресс хранится в браузере.

## Автоматическая публикация

Репозиторий `iatsuk/deelcolreg` публикуется через GitHub Actions. Push в `main` запускает `.github/workflows/pages.yml`: Node.js 24 → тесты → сборка → загрузка только `dist/` → GitHub Pages. `work/`, `.git/`, тесты и документация не попадают в веб-сборку. Установка npm-пакетов не требуется.

В Settings → Pages должен быть выбран источник **GitHub Actions**. До подключения DNS рабочая версия доступна по стандартному адресу `https://iatsuk.github.io/deelcolreg/`.

## Поддомен

Выбран адрес `colreg.deelstuff.com`. У DNS-провайдера домена требуется запись:

| Тип | Имя | Значение |
| --- | --- | --- |
| CNAME | colreg | iatsuk.github.io |

Значение не содержит `https://`, пути `/deelcolreg` или завершающих URL-параметров. Если для точного имени `colreg` уже есть другая A/AAAA/CNAME-запись, её нужно согласовать с новым CNAME; записи основного `deelstuff.com` менять не требуется.

Когда DNS-запись видна публично:

```sh
dig +short colreg.deelstuff.com CNAME
gh api --method PUT repos/iatsuk/deelcolreg/pages -f cname=colreg.deelstuff.com
gh api repos/iatsuk/deelcolreg/pages --jq '{html_url,cname,https_certificate,https_enforced}'
```

После выпуска сертификата включить Enforce HTTPS в настройках Pages либо:

```sh
gh api --method PUT repos/iatsuk/deelcolreg/pages -F https_enforced=true
```

При Actions-публикации файл CNAME не требуется и не определяет адрес; используется настройка Pages. Чтобы стандартный адрес оставался рабочим до настройки DNS, custom domain подключается после появления CNAME, а не заранее. Желательно также подтвердить владение доменом через GitHub Settings → Pages → Add a domain; GitHub выдаст индивидуальную TXT-запись.

## Правовые страницы

В приложении доступны локальные `#impressum`, `#datenschutz`, `#sources`. Они описывают именно этот проект, GitHub Pages и два ключа localStorage. Внешняя аналитика не включена. Шрифты загружаются локально. При дальнейшем подключении аналитики или других внешних сервисов описание обработки нужно актуализировать.

## Документация GitHub

- [Custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
- [Custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
- [HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).

## Состояние на 25.10.2026

Репозиторий публичный. Первый workflow тестирования и публикации завершился успешно. DNS `colreg.deelstuff.com CNAME iatsuk.github.io` проверен через публичный и авторитетный DNS-сервер. Custom domain подключён; GitHub одобрил сертификат, `https_enforced=true`. Рабочий адрес: https://colreg.deelstuff.com/.
