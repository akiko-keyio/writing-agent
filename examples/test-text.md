1 Introduction

Tropospheric parameters are essential for meteorological and space
geodetic applications (Mendes et al., 2002; Foster et al., 2006; Vieira
et al., 2022; Lu et al., 2017; Landskron & Böhm, 2018). Numerical
weather models (NWMs) have become a primary source for deriving these
parameters owing to their global coverage and high spatiotemporal
resolution (Bauer et al., 2015). However, NWM-derived parameters carry
inherent uncertainty due to imperfect observations and models
(Leutbecher & Palmer, 2008). Moreover, this uncertainty is
flow-dependent, varying substantially with the prevailing atmospheric
state (Judt, 2018; Zhang et al., 2003). Reliable quantification of such
flow-dependent uncertainty is therefore necessary for downstream
applications.

In geodetic applications, however, NWM-derived tropospheric delays are
typically assigned static, empirical uncertainties. For example, in
NWM-augmented Precise Point Positioning (PPP) and relative positioning,
NWM-derived a priori tropospheric delays are assigned a fixed or
latitude-dependent accuracy (Lu et al., 2017; Xu et al., 2018; Gao et
al., 2024). In tropospheric data fusion, such as combining Global
Navigation Satellite System (GNSS) and NWM precipitable water vapor via
variance component estimation method (Zhang et al., 2019), NWM errors
are assumed spatially homogeneous, with a single variance component
assigned to the entire spatial domain. In GNSS integrity monitoring, the
residual tropospheric delay error is overbounded based on long-term
climatological statistics (Rózsa et al., 2020; Yang et al., 2023). These
static error models cannot capture the flow-dependent variability of NWM
uncertainty, which changes spatiotemporally with weather patterns (Zhou
et al., 2020) and increases markedly during extreme weather events such
as storms (Yu et al., 2021).

In the meteorological field, ensemble methods have been developed to
quantify this flow-dependent uncertainty (Leutbecher & Palmer, 2008).
The Ensemble of Data Assimilations (EDA) is specifically designed to
quantify uncertainty in analysis fields (Isaksen et al., 2010). It
generates an ensemble of analyses, each subjected to perturbations that
sample known sources of error at each analysis cycle, thereby producing
flow-dependent estimates of analysis uncertainty. The EDA has become
integral to operational numerical weather prediction (NWP), providing
flow-dependent background error covariances for deterministic data
assimilation (Bonavita et al., 2012), initial perturbations for ensemble
prediction (Buizza et al., 2008), and guidance for observing-system
design (Tan et al., 2007; Harnisch et al., 2013). Such tropospheric
parameters with associated uncertainty estimates offer a potential
alternative to the static empirical uncertainties used in geodetic
applications. As both meteorological and geodetic applications depend on
reliable uncertainty estimates, comprehensive evaluation is essential,
which motivates this study.

In this study, we assess the accuracy of zenith tropospheric delays
(ZTDs) derived from the European Centre for Medium-Range Weather
Forecasts (ECMWF) Ensemble Long window Data Assimilation (ELDA), and
evaluate whether the accompanying ensemble spread provides a reliable
measure of ZTD uncertainty. Both assessments are performed using
independent ground-based GNSS tropospheric products. The paper is
organized as follows: Section 2 describes the data and methods, Section
3 presents the accuracy and reliability assessment results, Section 4
discusses factors affecting the reliability of the uncertainty
estimates, and Section 5 concludes.