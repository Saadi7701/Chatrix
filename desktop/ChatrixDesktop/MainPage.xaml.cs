namespace ChatrixDesktop;

public partial class MainPage : ContentPage
{
    // The target production hosted web URL (your deployed client on Vercel/Railway)
    private const string ProductionUrl = "https://desirable-happiness-production-3d32.up.railway.app";
    private const string LocalUrl = "http://localhost:5173";

    private string TargetUrl;

    public MainPage()
    {
        InitializeComponent();

        // Automatically determine target URL based on build configuration
#if DEBUG
        TargetUrl = LocalUrl;
#else
        TargetUrl = ProductionUrl;
#endif

        // Monitor network changes dynamically
        Connectivity.Current.ConnectivityChanged += OnConnectivityChanged;

        // Initial check and load
        CheckAndLoadUrl();
    }

    private void CheckAndLoadUrl()
    {
        if (Connectivity.Current.NetworkAccess == NetworkAccess.Internet)
        {
            OfflineOverlay.IsVisible = false;
            ChatrixWebView.IsVisible = true;

            // Load the web client if not already loaded or if previously failed
            if (ChatrixWebView.Source == null || string.IsNullOrWhiteSpace(ChatrixWebView.Source.ToString()))
            {
                ChatrixWebView.Source = TargetUrl;
            }
        }
        else
        {
            // Offline - swap UI to the dark overlay
            ChatrixWebView.IsVisible = false;
            OfflineOverlay.IsVisible = true;
        }
    }

    private void OnConnectivityChanged(object? sender, ConnectivityChangedEventArgs e)
    {
        MainThread.BeginInvokeOnMainThread(() =>
        {
            CheckAndLoadUrl();
        });
    }

    private void OnRetryClicked(object sender, EventArgs e)
    {
        CheckAndLoadUrl();

        // If online now, trigger a refresh of the WebView
        if (Connectivity.Current.NetworkAccess == NetworkAccess.Internet)
        {
            ChatrixWebView.Reload();
        }
    }

    private void OnWebViewNavigating(object? sender, WebNavigatingEventArgs e)
    {
        // Add custom hooks or logging if needed when transitions start
    }

    private void OnWebViewNavigated(object? sender, WebNavigatedEventArgs e)
    {
        // Handles failure to load web pages natively
        if (e.Result == WebNavigationResult.Failure)
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                ChatrixWebView.IsVisible = false;
                OfflineOverlay.IsVisible = true;
            });
        }
    }
}
