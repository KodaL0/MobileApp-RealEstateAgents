# mobile-test

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/KodaL0/mobile-test)

# Mobile App

## Map Implementation

This app uses **OpenStreetMap** as a free alternative to Google Maps. The map implementation includes:

### Features
- **Free Map Provider**: OpenStreetMap (no API keys required)
- **Cross-platform**: Works on iOS, Android, and Web
- **Interactive Markers**: Custom property markers with price labels
- **Real-time Filtering**: Filter properties by price, type, bedrooms, and listing type
- **Search Functionality**: Location-based property search
- **Property Cards**: Rich property previews in map callouts

### Technical Details
- **Native**: Uses `react-native-maps` with default OpenStreetMap provider
- **Web**: Custom web stub implementation with OpenStreetMap styling
- **No API Keys**: Completely free to use without any map service costs

### Map Components
- `MapScreen`: Main map interface with property markers and filtering
- `MapSearch`: Search component with quick location buttons
- `MapFilters`: Filter panel for property criteria
- `PropertyMapCard`: Property preview cards for markers and bottom list

### Benefits of OpenStreetMap
- ✅ **Free**: No usage limits or API costs
- ✅ **Open Source**: Community-driven map data
- ✅ **Privacy**: No tracking or data collection
- ✅ **Global Coverage**: Worldwide map coverage
- ✅ **Customizable**: Can be styled and customized as needed

The map provides the same functionality as Google Maps but without any licensing costs or API key requirements.