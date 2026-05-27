using Microsoft.Maui.Platform;

namespace ChatrixDesktop;

public partial class App : Application
{
    public App()
    {
        InitializeComponent();

        MainPage = new AppShell();
    }

    protected override Window CreateWindow(IActivationState? activationState)
    {
        var window = base.CreateWindow(activationState);

        // Customize window details for Windows and macOS
        window.Title = "Chatrix";

#if WINDOWS
        // Set fixed dimensions and center window on startup
        window.Width = 1240;
        window.Height = 820;

        // Hook up window created event to set startup position
        window.Created += (s, e) =>
        {
            var nativeWindow = window.Handler?.PlatformView as Microsoft.UI.Xaml.Window;
            if (nativeWindow != null)
            {
                // Retrieve native window handle
                var windowHandle = WinRT.Interop.WindowNative.GetWindowHandle(nativeWindow);
                var windowId = Microsoft.UI.Win32Interop.GetWindowIdFromWindow(windowHandle);
                var appWindow = Microsoft.UI.Windowing.AppWindow.GetFromWindowId(windowId);

                if (appWindow != null)
                {
                    // Center the window
                    var displayArea = Microsoft.UI.Windowing.DisplayArea.GetFromWindowId(windowId, Microsoft.UI.Windowing.DisplayAreaFallback.Nearest);
                    if (displayArea != null)
                    {
                        var centeredX = (displayArea.WorkArea.Width - appWindow.Size.Width) / 2;
                        var centeredY = (displayArea.WorkArea.Height - appWindow.Size.Height) / 2;
                        appWindow.Move(new Windows.Graphics.PointInt32(centeredX, centeredY));
                    }
                }
            }
        };
#endif

        return window;
    }
}
